"""
Macro Edge Service - Tracks institutional money flows to predict Polymarket outcomes
Computes 3 macro scores (inflation, fed rate cut, recession) from EODHD data
"""
import asyncio
import httpx
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta
from config import settings


class MacroEdgeService:
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

    async def _fetch_etf_history(self, client: httpx.AsyncClient, symbol: str, days: int) -> List[Dict]:
        """Fetch EOD prices for an ETF from EODHD"""
        today = datetime.now().strftime("%Y-%m-%d")
        from_date = (datetime.now() - timedelta(days=days + 10)).strftime("%Y-%m-%d")
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

    async def _fetch_vix_level(self, client: httpx.AsyncClient) -> Optional[float]:
        """Fetch current VIX level from EODHD"""
        try:
            response = await client.get(
                f"{self.base_url}/real-time/VIX.INDX",
                params={"api_token": self.eodhd_api_key, "fmt": "json"},
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("close") or data.get("previousClose")
            # Fallback to EOD
            today = datetime.now().strftime("%Y-%m-%d")
            from_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
            response = await client.get(
                f"{self.base_url}/eod/VIX.INDX",
                params={
                    "api_token": self.eodhd_api_key,
                    "from": from_date,
                    "to": today,
                    "period": "d",
                    "fmt": "json",
                },
            )
            if response.status_code == 200:
                data = response.json()
                if data:
                    return data[-1].get("close")
            return None
        except Exception:
            return None

    async def _fetch_bond_data(self, client: httpx.AsyncClient, country: str, period: str) -> List[Dict]:
        """Fetch government bond yield data"""
        ticker = f"{country}{period}.GBOND"
        today = datetime.now().strftime("%Y-%m-%d")
        from_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        try:
            response = await client.get(
                f"{self.base_url}/eod/{ticker}",
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

    def _compute_pct_change(self, prices: List[Dict], days: int) -> Optional[float]:
        """Compute percentage change over last N days from EOD data"""
        if not prices or len(prices) < 2:
            return None
        recent = prices[-min(days, len(prices)):]
        if not recent or recent[0]["close"] == 0:
            return None
        return ((recent[-1]["close"] - recent[0]["close"]) / recent[0]["close"]) * 100

    def _get_latest_yield(self, bond_data: List[Dict]) -> Optional[float]:
        """Get the latest yield from bond data"""
        if not bond_data:
            return None
        return bond_data[-1].get("close")

    def _get_yield_change_bps(self, bond_data: List[Dict], days: int) -> Optional[float]:
        """Get yield change in basis points over N days"""
        if not bond_data or len(bond_data) < 2:
            return None
        recent = bond_data[-min(days, len(bond_data)):]
        if not recent:
            return None
        return (recent[-1].get("close", 0) - recent[0].get("close", 0)) * 100

    async def fetch_all_signals(self) -> Dict[str, Any]:
        """Fetch all 10 data points in parallel"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            results = await asyncio.gather(
                self._fetch_etf_history(client, "XLE", 14),    # 0: Energy ETF
                self._fetch_etf_history(client, "GLD", 7),     # 1: Gold ETF
                self._fetch_etf_history(client, "XLY", 30),    # 2: Consumer Discretionary
                self._fetch_etf_history(client, "SPY", 30),    # 3: S&P 500
                self._fetch_etf_history(client, "XLF", 30),    # 4: Financials ETF
                self._fetch_etf_history(client, "IWM", 30),    # 5: Russell 2000
                self._fetch_etf_history(client, "XLU", 30),    # 6: Utilities ETF
                self._fetch_bond_data(client, "US", "10Y"),     # 7: 10Y Treasury
                self._fetch_bond_data(client, "US", "2Y"),      # 8: 2Y Treasury
                self._fetch_vix_level(client),                  # 9: VIX
                return_exceptions=True,
            )

            signals = {
                "xle": results[0] if not isinstance(results[0], Exception) else [],
                "gld": results[1] if not isinstance(results[1], Exception) else [],
                "xly": results[2] if not isinstance(results[2], Exception) else [],
                "spy": results[3] if not isinstance(results[3], Exception) else [],
                "xlf": results[4] if not isinstance(results[4], Exception) else [],
                "iwm": results[5] if not isinstance(results[5], Exception) else [],
                "xlu": results[6] if not isinstance(results[6], Exception) else [],
                "bond_10y": results[7] if not isinstance(results[7], Exception) else [],
                "bond_2y": results[8] if not isinstance(results[8], Exception) else [],
                "vix": results[9] if not isinstance(results[9], Exception) else None,
            }

            return signals

    def compute_inflation_score(self, signals: Dict[str, Any]) -> Dict[str, Any]:
        """
        Inflation Score (0-100): Higher = more inflation pressure
        - XLE 14d change (+25): Energy prices rising = inflation
        - 10Y yield 7d bps change (+30): Rising yields = inflation expectations
        - GLD 7d change (+20): Gold rising = inflation hedge demand
        - XLY vs SPY relative 30d (+25): Consumer discretionary weakness = inflation impact
        """
        score = 50  # Start neutral
        breakdown = []

        # XLE 14d change (weight: 25)
        xle_change = self._compute_pct_change(signals["xle"], 14)
        if xle_change is not None:
            xle_contrib = min(max(xle_change * 5, -25), 25)
            score += xle_contrib
            breakdown.append({
                "signal": "XLE 14d",
                "value": f"{xle_change:+.1f}%",
                "impact": "positive" if xle_change > 0 else "negative",
                "description": "Energy prices rising signals inflation" if xle_change > 0 else "Energy prices falling eases inflation",
            })

        # 10Y yield 7d bps change (weight: 30)
        yield_bps = self._get_yield_change_bps(signals["bond_10y"], 7)
        if yield_bps is not None:
            yield_contrib = min(max(yield_bps * 1.5, -30), 30)
            score += yield_contrib
            breakdown.append({
                "signal": "10Y Yield 7d",
                "value": f"{yield_bps:+.0f} bps",
                "impact": "positive" if yield_bps > 0 else "negative",
                "description": "Rising yields reflect inflation expectations" if yield_bps > 0 else "Falling yields ease inflation fears",
            })

        # GLD 7d change (weight: 20)
        gld_change = self._compute_pct_change(signals["gld"], 7)
        if gld_change is not None:
            gld_contrib = min(max(gld_change * 4, -20), 20)
            score += gld_contrib
            breakdown.append({
                "signal": "GLD 7d",
                "value": f"{gld_change:+.1f}%",
                "impact": "positive" if gld_change > 0 else "negative",
                "description": "Gold demand rising as inflation hedge" if gld_change > 0 else "Less demand for inflation hedges",
            })

        # XLY vs SPY relative 30d (weight: 25) — negative relative = inflation hurting consumers
        xly_change = self._compute_pct_change(signals["xly"], 30)
        spy_change = self._compute_pct_change(signals["spy"], 30)
        if xly_change is not None and spy_change is not None:
            relative = spy_change - xly_change  # Positive means XLY underperforming
            xly_contrib = min(max(relative * 3, -25), 25)
            score += xly_contrib
            breakdown.append({
                "signal": "XLY vs SPY 30d",
                "value": f"{relative:+.1f}%",
                "impact": "positive" if relative > 0 else "negative",
                "description": "Consumer discretionary lagging (inflation pressure)" if relative > 0 else "Consumer spending resilient",
            })

        return {
            "score": max(0, min(100, round(score))),
            "breakdown": breakdown,
        }

    def compute_fed_rate_cut_score(self, signals: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fed Rate Cut Score (0-100): Higher = more likely to cut
        - XLF 30d change (+30): Financials falling = rate cut expected
        - Yield curve spread 2Y-10Y (+40): Inversion/flattening = easing expected
        - IWM vs SPY relative 30d (+30): Small caps weak = economy needs easing
        """
        score = 50
        breakdown = []

        # XLF 30d change (weight: 30) — falling financials = rate cut expected
        xlf_change = self._compute_pct_change(signals["xlf"], 30)
        if xlf_change is not None:
            xlf_contrib = min(max(-xlf_change * 3, -30), 30)
            score += xlf_contrib
            breakdown.append({
                "signal": "XLF 30d",
                "value": f"{xlf_change:+.1f}%",
                "impact": "positive" if xlf_change < 0 else "negative",
                "description": "Weak financials signal rate cut expectations" if xlf_change < 0 else "Strong financials reduce cut urgency",
            })

        # Yield curve spread: 2Y - 10Y (weight: 40)
        yield_10y = self._get_latest_yield(signals["bond_10y"])
        yield_2y = self._get_latest_yield(signals["bond_2y"])
        if yield_10y is not None and yield_2y is not None:
            spread = yield_10y - yield_2y  # Negative = inverted = easing expected
            spread_contrib = min(max(-spread * 40, -40), 40)
            score += spread_contrib
            breakdown.append({
                "signal": "Yield Curve (10Y-2Y)",
                "value": f"{spread:+.2f}%",
                "impact": "positive" if spread < 0 else "negative",
                "description": "Inverted curve signals easing ahead" if spread < 0 else "Steep curve reduces cut probability",
            })

        # IWM vs SPY relative 30d (weight: 30) — small caps weak = economy needs easing
        iwm_change = self._compute_pct_change(signals["iwm"], 30)
        spy_change = self._compute_pct_change(signals["spy"], 30)
        if iwm_change is not None and spy_change is not None:
            relative = spy_change - iwm_change  # Positive means IWM underperforming
            iwm_contrib = min(max(relative * 3, -30), 30)
            score += iwm_contrib
            breakdown.append({
                "signal": "IWM vs SPY 30d",
                "value": f"{relative:+.1f}%",
                "impact": "positive" if relative > 0 else "negative",
                "description": "Small caps lagging signals need for easing" if relative > 0 else "Small caps outperforming reduces cut urgency",
            })

        return {
            "score": max(0, min(100, round(score))),
            "breakdown": breakdown,
        }

    def compute_recession_score(self, signals: Dict[str, Any]) -> Dict[str, Any]:
        """
        Recession Score (0-100): Higher = more recession risk
        - XLU vs SPY relative 30d (+35): Utilities outperforming = defensive rotation
        - XLY absolute 30d change (+35): Consumer discretionary falling = recession sign
        - VIX level (+30): High VIX = fear / recession risk
        """
        score = 50
        breakdown = []

        # XLU vs SPY relative 30d (weight: 35) — utilities outperforming = defensive
        xlu_change = self._compute_pct_change(signals["xlu"], 30)
        spy_change = self._compute_pct_change(signals["spy"], 30)
        if xlu_change is not None and spy_change is not None:
            relative = xlu_change - spy_change  # Positive means XLU outperforming
            xlu_contrib = min(max(relative * 5, -35), 35)
            score += xlu_contrib
            breakdown.append({
                "signal": "XLU vs SPY 30d",
                "value": f"{relative:+.1f}%",
                "impact": "positive" if relative > 0 else "negative",
                "description": "Defensive rotation into utilities" if relative > 0 else "Risk-on: cyclicals outperforming utilities",
            })

        # XLY absolute 30d change (weight: 35) — falling = recession
        xly_change = self._compute_pct_change(signals["xly"], 30)
        if xly_change is not None:
            xly_contrib = min(max(-xly_change * 3.5, -35), 35)
            score += xly_contrib
            breakdown.append({
                "signal": "XLY 30d",
                "value": f"{xly_change:+.1f}%",
                "impact": "positive" if xly_change < 0 else "negative",
                "description": "Consumer spending contracting" if xly_change < 0 else "Consumer spending holding up",
            })

        # VIX level (weight: 30) — higher = more fear
        vix = signals.get("vix")
        if vix is not None:
            # VIX < 15 = low fear, 15-25 = moderate, 25-35 = high, > 35 = extreme
            if vix < 15:
                vix_contrib = -15
            elif vix < 20:
                vix_contrib = -5
            elif vix < 25:
                vix_contrib = 5
            elif vix < 35:
                vix_contrib = 15
            else:
                vix_contrib = 30
            score += vix_contrib
            breakdown.append({
                "signal": "VIX Level",
                "value": f"{vix:.1f}",
                "impact": "positive" if vix > 25 else "negative" if vix < 20 else "neutral",
                "description": f"VIX at {vix:.0f} — {'elevated fear' if vix > 25 else 'moderate volatility' if vix > 20 else 'low fear'}",
            })

        return {
            "score": max(0, min(100, round(score))),
            "breakdown": breakdown,
        }

    async def fetch_polymarket_odds(self) -> Dict[str, Any]:
        """Fetch live Polymarket odds for macro markets via Gamma API"""
        cache_key = "polymarket-odds"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        # Search targets: best market IDs and fallback keyword search
        # These are searched dynamically — if IDs become stale, keyword search catches new ones
        TARGET_MARKETS = {
            "inflation": {
                "search_keywords": ["inflation", "cpi", "consumer price"],
                "known_slugs": ["will-annual-inflation-increase-by-3-0-in-january"],
            },
            "fed_rate_cut": {
                "search_keywords": ["fed rate cut", "fed decrease interest", "fed decision"],
                "known_slugs": [],
            },
            "recession": {
                "search_keywords": ["recession"],
                "known_slugs": ["us-recession-by-end-of-2026"],
            },
        }

        results = {
            "inflation": None,
            "fed_rate_cut": None,
            "recession": None,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                # Fetch a large batch of active events sorted by volume
                response = await client.get(
                    "https://gamma-api.polymarket.com/events",
                    params={
                        "closed": "false",
                        "active": "true",
                        "limit": 100,
                        "order": "volume24hr",
                        "ascending": "false",
                    },
                )

                events = []
                if response.status_code == 200:
                    events = response.json()

                # Also fetch with offset to get more events
                response2 = await client.get(
                    "https://gamma-api.polymarket.com/events",
                    params={
                        "closed": "false",
                        "active": "true",
                        "limit": 100,
                        "offset": 100,
                        "order": "volume24hr",
                        "ascending": "false",
                    },
                )
                if response2.status_code == 200:
                    events.extend(response2.json())

                # Search through events for matching markets
                for event in events:
                    title = event.get("title", "").lower()
                    markets = event.get("markets", [])

                    for score_key, target in TARGET_MARKETS.items():
                        if results[score_key] is not None:
                            continue

                        # Check if event title matches any keyword
                        if not any(kw in title for kw in target["search_keywords"]):
                            continue

                        # Inflation: aggregate probability of above-threshold brackets
                        if score_key == "inflation" and "annual" in title:
                            above_prob = 0.0
                            for m in markets:
                                q = m.get("question", "").lower()
                                # Sum brackets >= 2.5% (above-target inflation)
                                if any(x in q for x in ["2.5%", "2.6%", "2.7%", "2.8%", "2.9%", "3.0%", "≥2.5", "≥2.6", "≥2.7"]):
                                    prices = self._parse_outcome_prices(m.get("outcomePrices", "[]"))
                                    if prices:
                                        above_prob += prices[0]
                            if above_prob > 0:
                                results[score_key] = {
                                    "question": f"Inflation ≥2.5% ({event.get('title', '')})",
                                    "odds": round(above_prob * 100, 1),
                                    "source": "polymarket",
                                    "event_id": event.get("id"),
                                    "slug": event.get("slug", ""),
                                }

                        # Fed rate cuts: aggregate cut probabilities
                        elif score_key == "fed_rate_cut" and "fed" in title and ("rate" in title or "interest" in title or "decision" in title):
                            cut_prob = 0.0
                            for m in markets:
                                q = m.get("question", "").lower()
                                if "decrease" in q or "cut" in q:
                                    prices = self._parse_outcome_prices(m.get("outcomePrices", "[]"))
                                    if prices:
                                        cut_prob += prices[0]
                            if cut_prob > 0:
                                results[score_key] = {
                                    "question": event.get("title", ""),
                                    "odds": round(cut_prob * 100, 1),
                                    "source": "polymarket",
                                    "event_id": event.get("id"),
                                    "slug": event.get("slug", ""),
                                }

                        # Default: pick best single market
                        else:
                            best = self._pick_best_market(markets, target["search_keywords"])
                            if best:
                                results[score_key] = best

                # Fallback: try known slugs for any missing results
                for score_key, target in TARGET_MARKETS.items():
                    if results[score_key] is not None:
                        continue
                    for slug in target.get("known_slugs", []):
                        try:
                            resp = await client.get(
                                f"https://gamma-api.polymarket.com/markets",
                                params={"slug": slug},
                            )
                            if resp.status_code == 200:
                                data = resp.json()
                                if isinstance(data, list) and data:
                                    m = data[0]
                                    prices = self._parse_outcome_prices(m.get("outcomePrices", "[]"))
                                    if prices:
                                        results[score_key] = {
                                            "question": m.get("question", ""),
                                            "odds": round(prices[0] * 100, 1),
                                            "source": "polymarket",
                                            "market_id": m.get("id"),
                                            "slug": m.get("slug", ""),
                                        }
                                        break
                        except Exception:
                            continue

        except Exception:
            pass

        self._set_cache(cache_key, results)
        return results

    def _parse_outcome_prices(self, prices_str: str) -> List[float]:
        """Parse outcomePrices JSON string to list of floats"""
        import json
        try:
            prices = json.loads(prices_str) if isinstance(prices_str, str) else prices_str
            return [float(p) for p in prices]
        except (json.JSONDecodeError, ValueError, TypeError):
            return []

    def _pick_best_market(self, markets: List[Dict], keywords: List[str]) -> Optional[Dict]:
        """Pick the most relevant market from a list based on keywords and volume"""
        best = None
        best_volume = -1
        for m in markets:
            if m.get("closed"):
                continue
            q = m.get("question", "").lower()
            if any(kw in q for kw in keywords) or len(markets) == 1:
                prices = self._parse_outcome_prices(m.get("outcomePrices", "[]"))
                volume = m.get("volumeNum", 0) or 0
                if prices and volume > best_volume:
                    best_volume = volume
                    best = {
                        "question": m.get("question", ""),
                        "odds": round(prices[0] * 100, 1),
                        "source": "polymarket",
                        "market_id": m.get("id"),
                        "slug": m.get("slug", ""),
                    }
        # If no keyword match but only one market in event, use it
        if best is None and len(markets) == 1 and not markets[0].get("closed"):
            m = markets[0]
            prices = self._parse_outcome_prices(m.get("outcomePrices", "[]"))
            if prices:
                best = {
                    "question": m.get("question", ""),
                    "odds": round(prices[0] * 100, 1),
                    "source": "polymarket",
                    "market_id": m.get("id"),
                    "slug": m.get("slug", ""),
                }
        return best

    async def get_alto_analysis(self, scores: Dict[str, Any]) -> str:
        """Send macro scores to Alto LLM for narrative analysis"""
        if not self.alto_base_url or not self.alto_api_key:
            return "Alto analysis unavailable — API not configured."

        prompt = f"""You are a macro strategist. Analyze these Macro Edge scores and provide a brief (3-4 sentences) market outlook.

Inflation Score: {scores['inflation']['score']}/100
Fed Rate Cut Score: {scores['fed_rate_cut']['score']}/100
Recession Score: {scores['recession']['score']}/100

Signal details:
- Inflation: {', '.join(f"{b['signal']}: {b['value']}" for b in scores['inflation']['breakdown'])}
- Fed Rate Cut: {', '.join(f"{b['signal']}: {b['value']}" for b in scores['fed_rate_cut']['breakdown'])}
- Recession: {', '.join(f"{b['signal']}: {b['value']}" for b in scores['recession']['breakdown'])}

Focus on what institutional flows suggest about near-term outcomes. Be specific about which signals matter most right now."""

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
                            {"role": "system", "content": "You are Alto, a macro strategist at Strato. Provide concise, data-driven analysis. No disclaimers."},
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

    async def get_macro_edge_scores(self) -> Dict[str, Any]:
        """Main entry: fetch signals, compute scores, get analysis, cache result"""
        cache_key = "macro-edge-scores"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        # Fetch all signals in parallel
        signals = await self.fetch_all_signals()

        # Compute scores
        scores = {
            "inflation": self.compute_inflation_score(signals),
            "fed_rate_cut": self.compute_fed_rate_cut_score(signals),
            "recession": self.compute_recession_score(signals),
        }

        # Fetch Polymarket odds and Alto analysis in parallel
        alto_analysis, polymarket = await asyncio.gather(
            self.get_alto_analysis(scores),
            self.fetch_polymarket_odds(),
            return_exceptions=True,
        )

        if isinstance(alto_analysis, Exception):
            alto_analysis = "Alto analysis temporarily unavailable."
        if isinstance(polymarket, Exception):
            polymarket = {"inflation": None, "fed_rate_cut": None, "recession": None}

        result = {
            "scores": scores,
            "polymarket": polymarket,
            "alto_analysis": alto_analysis,
            "timestamp": datetime.now().isoformat(),
            "signal_metadata": {
                "xle_points": len(signals.get("xle", [])),
                "gld_points": len(signals.get("gld", [])),
                "spy_points": len(signals.get("spy", [])),
                "vix": signals.get("vix"),
                "bond_10y_yield": self._get_latest_yield(signals.get("bond_10y", [])),
                "bond_2y_yield": self._get_latest_yield(signals.get("bond_2y", [])),
            },
        }

        self._set_cache(cache_key, result)
        return result
