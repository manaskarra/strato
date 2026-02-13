"""
Earnings Prediction Service - Predicts earnings beat/miss probability
Uses EODHD data (earnings calendar, fundamentals, insider transactions, price history)
to compute a beat probability score (0-100) for upcoming earnings.
"""
import asyncio
import httpx
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from config import settings


class EarningsPredictionService:
    def __init__(self):
        self.eodhd_api_key = settings.eodhd_api_key
        self.base_url = "https://eodhd.com/api"
        self.alto_base_url = settings.alto_api_base_url
        self.alto_api_key = settings.alto_api_key
        self.alto_model = settings.alto_model
        self.cache: Dict[str, tuple[Any, datetime]] = {}
        self.cache_ttl = timedelta(minutes=5)

    def _get_from_cache(self, key: str) -> Optional[Any]:
        if key in self.cache:
            data, timestamp = self.cache[key]
            if datetime.now() - timestamp < self.cache_ttl:
                return data
            else:
                del self.cache[key]
        return None

    def _set_cache(self, key: str, data: Any):
        self.cache[key] = (data, datetime.now())

    async def _fetch_earnings_calendar(self, client: httpx.AsyncClient) -> List[Dict]:
        """Fetch upcoming earnings calendar for next 14 days from EODHD"""
        today = datetime.now().strftime("%Y-%m-%d")
        to_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")
        try:
            response = await client.get(
                f"{self.base_url}/calendar/earnings",
                params={
                    "api_token": self.eodhd_api_key,
                    "from": today,
                    "to": to_date,
                    "fmt": "json",
                },
            )
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and "earnings" in data:
                    return data["earnings"]
                if isinstance(data, list):
                    return data
                return []
            return []
        except Exception:
            return []

    async def _fetch_fundamentals(self, client: httpx.AsyncClient, symbol: str) -> Optional[Dict]:
        """Fetch fundamentals data for a symbol"""
        try:
            response = await client.get(
                f"{self.base_url}/fundamentals/{symbol}.US",
                params={
                    "api_token": self.eodhd_api_key,
                    "fmt": "json",
                },
            )
            if response.status_code == 200:
                return response.json()
            return None
        except Exception:
            return None

    async def _fetch_price_history(self, client: httpx.AsyncClient, symbol: str, days: int = 15) -> List[Dict]:
        """Fetch recent EOD price history"""
        today = datetime.now().strftime("%Y-%m-%d")
        from_date = (datetime.now() - timedelta(days=days + 5)).strftime("%Y-%m-%d")
        try:
            response = await client.get(
                f"{self.base_url}/eod/{symbol}.US",
                params={
                    "api_token": self.eodhd_api_key,
                    "from": from_date,
                    "to": today,
                    "period": "d",
                    "fmt": "json",
                },
            )
            if response.status_code == 200:
                return response.json()
            return []
        except Exception:
            return []

    async def _fetch_insider_transactions(self, client: httpx.AsyncClient, symbol: str) -> List[Dict]:
        """Fetch recent insider transactions"""
        try:
            response = await client.get(
                f"{self.base_url}/insider-transactions",
                params={
                    "api_token": self.eodhd_api_key,
                    "code": f"{symbol}.US",
                    "limit": 10,
                    "fmt": "json",
                },
            )
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    return data
                return []
            return []
        except Exception:
            return []

    def _compute_historical_beat_rate(self, fundamentals: Optional[Dict]) -> Dict[str, Any]:
        """Historical Beat Rate: +/-15 pts based on last 8 quarters of earnings history"""
        signal = {"name": "Historical Beat Rate", "value": "N/A", "impact": "neutral", "score": 0, "raw_data": []}

        if not fundamentals:
            return signal

        earnings_history = fundamentals.get("Earnings", {}).get("History", {})
        if not earnings_history:
            return signal

        # Get last 8 quarters
        quarters = sorted(earnings_history.keys(), reverse=True)[:8]
        beats = 0
        total = 0
        history_data = []

        for q in quarters:
            entry = earnings_history[q]
            actual = entry.get("epsActual")
            estimate = entry.get("epsEstimate")
            if actual is not None and estimate is not None:
                total += 1
                beat = actual > estimate
                if beat:
                    beats += 1

                surprise = ((actual - estimate) / abs(estimate)) * 100 if estimate != 0 else 0
                history_data.append({
                    "quarter": q,
                    "actual": actual,
                    "estimate": estimate,
                    "beat": beat,
                    "surprise_pct": round(surprise, 1)
                })

        if total == 0:
            return signal

        beat_rate = beats / total
        # Scale: 50% beat rate = 0 pts, 100% = +15, 0% = -15
        score = (beat_rate - 0.5) * 30
        score = max(-15, min(15, score))

        signal["value"] = f"{beats}/{total} beats"
        signal["impact"] = "bullish" if beat_rate > 0.5 else "bearish" if beat_rate < 0.5 else "neutral"
        signal["score"] = round(score, 1)
        signal["raw_data"] = history_data
        signal["beat_rate"] = round(beat_rate * 100, 1)
        return signal

    def _compute_revenue_growth(self, fundamentals: Optional[Dict]) -> Dict[str, Any]:
        """Revenue Growth: +/-20 pts based on quarterly revenue growth YOY"""
        signal = {"name": "Revenue Growth", "value": "N/A", "impact": "neutral", "score": 0, "raw_data": {}}

        if not fundamentals:
            return signal

        highlights = fundamentals.get("Highlights", {})
        growth = highlights.get("QuarterlyRevenueGrowthYOY")

        if growth is None:
            return signal

        growth_pct = growth * 100 if abs(growth) < 5 else growth
        # Scale: 0% = 0 pts, >20% = +20, <-20% = -20
        score = max(-20, min(20, growth_pct))

        # Get additional revenue context
        market_cap = highlights.get("MarketCapitalization", 0)
        revenue_ttm = highlights.get("RevenueTTM", 0)

        signal["value"] = f"{growth_pct:+.1f}%"
        signal["impact"] = "bullish" if growth_pct > 5 else "bearish" if growth_pct < -5 else "neutral"
        signal["score"] = round(score, 1)
        signal["raw_data"] = {
            "growth_yoy": round(growth_pct, 2),
            "market_cap": market_cap,
            "revenue_ttm": revenue_ttm,
        }
        return signal

    def _compute_margin_signal(self, fundamentals: Optional[Dict]) -> Dict[str, Any]:
        """Margin vs Sector: +/-15 pts based on profit margin strength"""
        signal = {"name": "Profit Margin", "value": "N/A", "impact": "neutral", "score": 0, "raw_data": {}}

        if not fundamentals:
            return signal

        highlights = fundamentals.get("Highlights", {})
        margin = highlights.get("ProfitMargin")

        if margin is None:
            return signal

        margin_pct = margin * 100 if abs(margin) < 2 else margin
        # Healthy margin thresholds: >15% strong, 5-15% ok, <5% weak
        if margin_pct > 20:
            score = 15
        elif margin_pct > 10:
            score = 10
        elif margin_pct > 5:
            score = 5
        elif margin_pct > 0:
            score = 0
        else:
            score = -15

        # Get additional margin context
        gross_margin = highlights.get("GrossMargin", 0)
        operating_margin = highlights.get("OperatingMarginTTM", 0)

        signal["value"] = f"{margin_pct:.1f}%"
        signal["impact"] = "bullish" if score > 5 else "bearish" if score < 0 else "neutral"
        signal["score"] = score
        signal["raw_data"] = {
            "profit_margin": round(margin_pct, 2),
            "gross_margin": round(gross_margin * 100 if abs(gross_margin) < 2 else gross_margin, 2),
            "operating_margin": round(operating_margin * 100 if abs(operating_margin) < 2 else operating_margin, 2),
        }
        return signal

    def _compute_momentum(self, prices: List[Dict]) -> Dict[str, Any]:
        """Pre-Earnings Momentum: +/-10 pts based on recent 10-day price change"""
        signal = {"name": "Pre-Earnings Momentum", "value": "N/A", "impact": "neutral", "score": 0, "raw_data": []}

        if not prices or len(prices) < 2:
            return signal

        recent = prices[-min(10, len(prices)):]
        if not recent or recent[0].get("close", 0) == 0:
            return signal

        change = ((recent[-1]["close"] - recent[0]["close"]) / recent[0]["close"]) * 100
        # Scale: clamp to +/-10
        score = max(-10, min(10, change * 2))

        # Include price data for charting
        price_data = [{
            "date": p.get("date", ""),
            "close": p.get("close", 0),
            "volume": p.get("volume", 0)
        } for p in recent]

        signal["value"] = f"{change:+.1f}%"
        signal["impact"] = "bullish" if change > 2 else "bearish" if change < -2 else "neutral"
        signal["score"] = round(score, 1)
        signal["raw_data"] = price_data
        signal["price_change_pct"] = round(change, 2)
        signal["start_price"] = recent[0].get("close", 0)
        signal["end_price"] = recent[-1].get("close", 0)
        return signal

    def _compute_insider_signal(self, transactions: List[Dict]) -> Dict[str, Any]:
        """Insider Activity: +/-10 pts based on net buys vs sells"""
        signal = {"name": "Insider Sentiment", "value": "N/A", "impact": "neutral", "score": 0, "raw_data": []}

        if not transactions:
            return signal

        buys = 0
        sells = 0
        transaction_details = []

        for t in transactions:
            trans_type = (t.get("transactionType") or t.get("transaction_type") or "").lower()
            owner = t.get("ownerName", "Unknown")
            shares = t.get("transactionShares", 0)
            price = t.get("transactionPrice", 0)
            date = t.get("date", "")

            transaction_details.append({
                "date": date,
                "owner": owner,
                "type": trans_type,
                "shares": shares,
                "price": price,
                "value": shares * price if shares and price else 0
            })

            if "buy" in trans_type or "purchase" in trans_type:
                buys += 1
            elif "sale" in trans_type or "sell" in trans_type:
                sells += 1

        total = buys + sells
        if total == 0:
            signal["value"] = "No activity"
            return signal

        net_ratio = (buys - sells) / total
        score = round(net_ratio * 10, 1)
        score = max(-10, min(10, score))

        signal["value"] = f"{buys}B / {sells}S"
        signal["impact"] = "bullish" if buys > sells else "bearish" if sells > buys else "neutral"
        signal["score"] = score
        signal["raw_data"] = transaction_details[:10]  # Limit to 10 most recent
        signal["buys"] = buys
        signal["sells"] = sells
        return signal

    async def calculate_beat_probability(
        self,
        client: httpx.AsyncClient,
        symbol: str,
        earnings_entry: Dict,
    ) -> Optional[Dict[str, Any]]:
        """Calculate beat probability for a single company"""
        # Fetch all data in parallel
        fundamentals, prices, insiders = await asyncio.gather(
            self._fetch_fundamentals(client, symbol),
            self._fetch_price_history(client, symbol),
            self._fetch_insider_transactions(client, symbol),
            return_exceptions=True,
        )

        if isinstance(fundamentals, Exception):
            fundamentals = None
        if isinstance(prices, Exception):
            prices = []
        if isinstance(insiders, Exception):
            insiders = []

        # Compute individual signals
        historical = self._compute_historical_beat_rate(fundamentals)
        revenue = self._compute_revenue_growth(fundamentals)
        margin = self._compute_margin_signal(fundamentals)
        momentum = self._compute_momentum(prices)
        insider = self._compute_insider_signal(insiders)

        signals = [historical, revenue, margin, momentum, insider]

        # Base score of 50 + sum of signal contributions
        total_score = 50 + sum(s["score"] for s in signals)
        total_score = max(0, min(100, round(total_score)))

        # Determine prediction label and confidence
        if total_score >= 70:
            prediction = "LIKELY BEAT"
            confidence = "HIGH"
        elif total_score >= 55:
            prediction = "LIKELY BEAT"
            confidence = "MODERATE"
        elif total_score <= 30:
            prediction = "LIKELY MISS"
            confidence = "HIGH"
        elif total_score <= 45:
            prediction = "LIKELY MISS"
            confidence = "MODERATE"
        else:
            prediction = "UNCERTAIN"
            confidence = "LOW"

        # Extract company info
        company_name = earnings_entry.get("company") or earnings_entry.get("name") or symbol
        eps_estimate = earnings_entry.get("eps_estimate") or earnings_entry.get("estimate")
        report_date = earnings_entry.get("report_date") or earnings_entry.get("date") or ""

        # Get market cap from fundamentals if available
        market_cap = None
        if fundamentals:
            market_cap = fundamentals.get("Highlights", {}).get("MarketCapitalization")

        return {
            "symbol": symbol,
            "company_name": company_name,
            "report_date": report_date,
            "eps_estimate": eps_estimate,
            "beat_probability": total_score,
            "prediction": prediction,
            "confidence": confidence,
            "signals": signals,
            "market_cap": market_cap,
        }

    def _filter_and_sort_earnings(self, earnings: List[Dict]) -> List[Dict]:
        """Filter to US stocks and sort by market cap / relevance, take top 12"""
        # Filter for entries that look like US stocks
        filtered = []
        for entry in earnings:
            code = entry.get("code") or entry.get("ticker") or ""
            exchange = entry.get("exchange") or ""
            # Accept US exchanges or entries without exchange info
            if exchange.upper() in ("US", "NYSE", "NASDAQ", "AMEX", "") and code:
                # Skip entries that look like non-US (contain dots suggesting foreign exchange)
                if "." not in code:
                    filtered.append(entry)

        # Sort by market_cap if available, otherwise just take first 12
        filtered.sort(key=lambda x: x.get("market_cap", 0) or 0, reverse=True)
        return filtered[:12]

    async def get_alto_analysis(self, predictions: List[Dict]) -> str:
        """Send top predictions to Alto LLM for a brief summary"""
        if not self.alto_base_url or not self.alto_api_key:
            return "Alto analysis unavailable — API not configured."

        summary_lines = []
        for p in predictions[:6]:
            summary_lines.append(
                f"- {p['symbol']} ({p['company_name']}): {p['beat_probability']}% beat probability, "
                f"prediction: {p['prediction']}, reporting {p['report_date']}"
            )

        prompt = f"""You are an earnings analyst. Analyze these upcoming earnings predictions and provide a brief (3-4 sentences) summary of this week's earnings trends.

Upcoming Earnings Predictions:
{chr(10).join(summary_lines)}

Focus on which companies are most likely to surprise, any sector themes, and what investors should watch. Be specific and data-driven."""

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.alto_base_url}/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.alto_api_key}",
                    },
                    json={
                        "model": self.alto_model,
                        "messages": [
                            {"role": "system", "content": "You are Alto, an earnings analyst at Strato. Provide concise, data-driven analysis. No disclaimers."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.7,
                        "max_tokens": 500,
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    return data.get("choices", [{}])[0].get("message", {}).get("content", "Analysis unavailable.")
                return "Alto analysis temporarily unavailable."
        except Exception:
            return "Alto analysis temporarily unavailable."

    async def get_earnings_predictions(self) -> Dict[str, Any]:
        """Main entry point: fetch upcoming earnings, compute scores, get analysis"""
        cache_key = "earnings-predictions"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Fetch earnings calendar
            earnings = await self._fetch_earnings_calendar(client)

            if not earnings:
                return {
                    "predictions": [],
                    "alto_analysis": "No upcoming earnings found in the next 14 days.",
                    "timestamp": datetime.now().isoformat(),
                    "earnings_count": 0,
                }

            # Filter and sort to top candidates
            top_earnings = self._filter_and_sort_earnings(earnings)

            if not top_earnings:
                return {
                    "predictions": [],
                    "alto_analysis": "No US earnings found in the upcoming calendar.",
                    "timestamp": datetime.now().isoformat(),
                    "earnings_count": 0,
                }

            # Calculate beat probability for each company in parallel
            tasks = []
            for entry in top_earnings:
                symbol = entry.get("code") or entry.get("ticker") or ""
                if symbol:
                    tasks.append(self.calculate_beat_probability(client, symbol, entry))

            results = await asyncio.gather(*tasks, return_exceptions=True)

            predictions = []
            for r in results:
                if isinstance(r, dict):
                    predictions.append(r)

            # Sort by beat probability descending
            predictions.sort(key=lambda x: x["beat_probability"], reverse=True)

        # Get Alto analysis
        alto_analysis = await self.get_alto_analysis(predictions)

        result = {
            "predictions": predictions,
            "alto_analysis": alto_analysis,
            "timestamp": datetime.now().isoformat(),
            "earnings_count": len(predictions),
        }

        self._set_cache(cache_key, result)
        return result

    def calculate_edge(self, alto_prediction: float, polymarket_odds: float) -> Dict[str, Any]:
        """
        Calculate edge between Alto's prediction and Polymarket odds
        Returns edge magnitude, category, and trading recommendation
        """
        edge = alto_prediction - polymarket_odds
        edge_abs = abs(edge)

        # Categorize edge magnitude
        if edge_abs < 5:
            category = "ALIGNED"
            color = "neutral"
        elif edge_abs < 15:
            category = "SMALL EDGE"
            color = "warning"
        else:
            category = "SIGNIFICANT EDGE"
            color = "danger"

        # Generate recommendation
        if edge > 15:
            recommendation = f"Alto predicts BEAT more strongly ({edge:+.0f}pts vs market)"
            signal = "BULLISH"
        elif edge < -15:
            recommendation = f"Alto predicts MISS more strongly ({edge:.0f}pts vs market)"
            signal = "BEARISH"
        elif edge_abs < 5:
            recommendation = "Model and market in agreement"
            signal = "NEUTRAL"
        else:
            recommendation = f"Modest disagreement ({edge:+.0f}pts)"
            signal = "NEUTRAL"

        return {
            "edge": round(edge, 1),
            "edge_abs": round(edge_abs, 1),
            "category": category,
            "color": color,
            "recommendation": recommendation,
            "signal": signal
        }
