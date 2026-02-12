"""
Alto Context Detection and Data Fetching
"""
import asyncio
import httpx
import re
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta


class AltoContext:
    def __init__(self, eodhd_api_key: str):
        self.eodhd_api_key = eodhd_api_key
        self.base_url = "https://eodhd.com/api"
        self.cache: Dict[str, tuple[Any, datetime]] = {}
        self.cache_ttl = timedelta(minutes=5)

    def _get_from_cache(self, key: str) -> Optional[Any]:
        """Get data from cache if not expired"""
        if key in self.cache:
            data, timestamp = self.cache[key]
            if datetime.now() - timestamp < self.cache_ttl:
                return data
            else:
                del self.cache[key]
        return None

    def _set_cache(self, key: str, data: Any):
        """Store data in cache"""
        self.cache[key] = (data, datetime.now())

    def extract_symbols(self, text: str) -> List[str]:
        """Extract stock symbols from text"""
        # Match common stock symbol patterns: $AAPL, TSLA, etc.
        pattern = r'\$?([A-Z]{1,5})\b'
        matches = re.findall(pattern, text)
        if not matches:
            return []
        # Remove duplicates
        return list(set(matches))

    def has_portfolio_intent(self, text: str) -> bool:
        """Check if text contains portfolio-related keywords"""
        portfolio_keywords = [
            'portfolio', 'holdings', 'positions', 'my stocks',
            'my investments', 'what i own'
        ]
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in portfolio_keywords)

    def has_market_intent(self, text: str) -> bool:
        """Check if text contains market-related keywords"""
        market_keywords = [
            'market', 's&p', 'sp500', 'nasdaq', 'dow',
            'indices', 'market today', 'markets'
        ]
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in market_keywords)

    def detect_stock_intent(self, message: str) -> str:
        """Detect what type of stock analysis the user wants - enables smart API selection"""
        message_lower = message.lower()

        # Price check - just want current price
        price_keywords = ['price', 'trading at', 'current price', 'stock price', 'how much', 'cost']
        if any(kw in message_lower for kw in price_keywords) and len(message.split()) < 8:
            return 'price'

        # Technical analysis
        technical_keywords = ['technical', 'technicals', 'chart', 'rsi', 'macd', 'moving average',
                             'sma', 'bollinger', 'indicators', 'overbought', 'oversold', 'trend']
        if any(kw in message_lower for kw in technical_keywords):
            return 'technical'

        # Fundamental analysis
        fundamental_keywords = ['fundamental', 'fundamentals', 'valuation', 'pe ratio', 'p/e',
                               'earnings per share', 'eps', 'revenue', 'profit', 'balance sheet',
                               'income statement', 'overvalued', 'undervalued', 'fair value']
        if any(kw in message_lower for kw in fundamental_keywords):
            return 'fundamental'

        # Earnings
        earnings_keywords = ['earnings', 'earnings date', 'earnings report', 'quarterly results',
                            'eps estimate', 'when is earnings']
        if any(kw in message_lower for kw in earnings_keywords):
            return 'earnings'

        # Insider activity
        insider_keywords = ['insider', 'insider buying', 'insider selling', 'insider trading',
                           'insider transactions', 'executives buying', 'insiders']
        if any(kw in message_lower for kw in insider_keywords):
            return 'insider'

        # News/sentiment
        news_keywords = ['news', 'headlines', 'what happened', 'latest news', 'recent news',
                        'any news', "what's happening"]
        if any(kw in message_lower for kw in news_keywords):
            return 'news'

        # Comparison/peers
        comparison_keywords = ['compare', 'comparison', 'versus', 'vs', 'peer', 'competitor',
                              'similar', 'alternative', 'better than']
        if any(kw in message_lower for kw in comparison_keywords):
            return 'comparison'

        # Full analysis - explicit request or comprehensive questions
        full_keywords = ['analyze', 'analysis', 'full analysis', 'complete analysis', 'deep dive',
                        'comprehensive', 'everything', 'all data', 'full picture']
        if any(kw in message_lower for kw in full_keywords):
            return 'full'

        # Default: Smart minimal (price + news if short query, moderate if detailed question)
        if len(message.split()) <= 6:
            return 'minimal'  # Short query = price + basic context
        else:
            return 'moderate'  # Longer query = price + fundamentals + news

    async def fetch_stock_insights(self, symbol: str, exchange: str = "US", intent: str = "full") -> Dict[str, Any]:
        """Fetch stock data from EODHD based on user intent (smart API selection)"""
        cache_key = f"stock-{symbol.upper()}-{intent}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        ticker = f"{symbol}.{exchange}"
        today = datetime.now().strftime("%Y-%m-%d")
        six_months_ago = (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d")
        one_month_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        one_week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
        three_days_ago = (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d")
        ninety_days_ahead = (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d")

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Build API requests based on intent
            requests = []
            request_map = {}  # Track what each index represents

            # Real-time price - ALWAYS fetch (cheap and essential)
            requests.append(client.get(f"{self.base_url}/real-time/{ticker}", params={
                "api_token": self.eodhd_api_key, "fmt": "json"
            }))
            request_map[len(requests)-1] = "realTimePrice"

            # Intent-based conditional fetching
            if intent in ["price"]:
                # Just price - already have real-time, done!
                pass

            elif intent == "technical":
                # Technical analysis: All technical indicators
                tech_requests = [
                    ("rsi", {"function": "rsi", "period": 14}),
                    ("macd", {"function": "macd", "fast_period": 12, "slow_period": 26, "signal_period": 9}),
                    ("sma_50", {"function": "sma", "period": 50}),
                    ("bbands", {"function": "bbands", "period": 20}),
                    ("stochastic", {"function": "stochastic", "period": 14}),
                    ("atr", {"function": "atr", "period": 14}),
                    ("sma_200", {"function": "sma", "period": 200}),
                ]
                for name, params in tech_requests:
                    params.update({"from": six_months_ago, "to": today, "order": "d",
                                  "api_token": self.eodhd_api_key, "fmt": "json"})
                    requests.append(client.get(f"{self.base_url}/technical/{ticker}", params=params))
                    request_map[len(requests)-1] = f"technical_{name}"

            elif intent == "fundamental":
                # Fundamental analysis: Fundamentals + historical prices
                requests.append(client.get(f"{self.base_url}/fundamentals/{ticker}", params={
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "fundamental"

                requests.append(client.get(f"{self.base_url}/eod/{ticker}", params={
                    "from": one_month_ago, "to": today, "period": "d",
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "recentPrice"

            elif intent == "earnings":
                # Earnings: Calendar + fundamentals (for context)
                requests.append(client.get(f"{self.base_url}/calendar/earnings", params={
                    "symbols": ticker, "from": today, "to": ninety_days_ahead,
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "earnings"

                requests.append(client.get(f"{self.base_url}/fundamentals/{ticker}", params={
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "fundamental"

            elif intent == "insider":
                # Insider: Transactions only
                requests.append(client.get(f"{self.base_url}/insider-transactions", params={
                    "code": ticker, "limit": 10,
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "insiderTransactions"

            elif intent == "news":
                # News: News + price for context
                requests.append(client.get(f"{self.base_url}/news", params={
                    "s": ticker, "from": one_week_ago, "to": today, "limit": 10,
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "news"

            elif intent == "comparison":
                # Comparison: Fundamentals + price + key metrics
                requests.append(client.get(f"{self.base_url}/fundamentals/{ticker}", params={
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "fundamental"

                requests.append(client.get(f"{self.base_url}/eod/{ticker}", params={
                    "from": one_month_ago, "to": today, "period": "d",
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "recentPrice"

            elif intent == "minimal":
                # Minimal: Just price + fundamentals (for basic context)
                requests.append(client.get(f"{self.base_url}/fundamentals/{ticker}", params={
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "fundamental"

            elif intent == "moderate":
                # Moderate: Price + fundamentals + news
                requests.append(client.get(f"{self.base_url}/fundamentals/{ticker}", params={
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "fundamental"

                requests.append(client.get(f"{self.base_url}/news", params={
                    "s": ticker, "from": one_week_ago, "to": today, "limit": 10,
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "news"

            else:  # intent == "full" or unknown
                # Full analysis: Everything!
                # Technical indicators (7 calls)
                tech_requests = [
                    ("rsi", {"function": "rsi", "period": 14}),
                    ("macd", {"function": "macd", "fast_period": 12, "slow_period": 26, "signal_period": 9}),
                    ("sma_50", {"function": "sma", "period": 50}),
                    ("bbands", {"function": "bbands", "period": 20}),
                    ("stochastic", {"function": "stochastic", "period": 14}),
                    ("atr", {"function": "atr", "period": 14}),
                    ("sma_200", {"function": "sma", "period": 200}),
                ]
                for name, params in tech_requests:
                    params.update({"from": six_months_ago, "to": today, "order": "d",
                                  "api_token": self.eodhd_api_key, "fmt": "json"})
                    requests.append(client.get(f"{self.base_url}/technical/{ticker}", params=params))
                    request_map[len(requests)-1] = f"technical_{name}"

                # Fundamentals
                requests.append(client.get(f"{self.base_url}/fundamentals/{ticker}", params={
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "fundamental"

                # News
                requests.append(client.get(f"{self.base_url}/news", params={
                    "s": ticker, "from": one_week_ago, "to": today, "limit": 10,
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "news"

                # Historical prices
                requests.append(client.get(f"{self.base_url}/eod/{ticker}", params={
                    "from": one_month_ago, "to": today, "period": "d",
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "recentPrice"

                # Dividends
                requests.append(client.get(f"{self.base_url}/div/{ticker}", params={
                    "from": "2020-01-01", "to": today,
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "dividends"

                # Splits
                requests.append(client.get(f"{self.base_url}/splits/{ticker}", params={
                    "from": "2020-01-01", "to": today,
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "splits"

                # Intraday
                requests.append(client.get(f"{self.base_url}/intraday/{ticker}", params={
                    "interval": "5m", "from": three_days_ago, "to": today,
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "intraday"

                # Earnings
                requests.append(client.get(f"{self.base_url}/calendar/earnings", params={
                    "symbols": ticker, "from": today, "to": ninety_days_ahead,
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "earnings"

                # Insider transactions
                requests.append(client.get(f"{self.base_url}/insider-transactions", params={
                    "code": ticker, "limit": 10,
                    "api_token": self.eodhd_api_key, "fmt": "json"
                }))
                request_map[len(requests)-1] = "insiderTransactions"

            # Execute all requests in parallel
            results = await asyncio.gather(*requests, return_exceptions=True)

            # Build insights dictionary based on what was fetched
            insights = {"intent": intent}  # Track what intent was used

            # Parse results based on request_map
            for idx, key in request_map.items():
                if not isinstance(results[idx], Exception) and results[idx].status_code == 200:
                    data = results[idx].json()

                    if key.startswith("technical_"):
                        # Technical indicator
                        if "technical" not in insights:
                            insights["technical"] = {}
                        indicator_name = key.replace("technical_", "")
                        insights["technical"][indicator_name] = data
                    else:
                        # Direct mapping
                        insights[key] = data

            self._set_cache(cache_key, insights)
            return insights

    def format_stock_context(self, symbol: str, data: Dict[str, Any]) -> str:
        """Format stock data for LLM consumption"""
        if not data:
            return ""

        formatted = f"# Stock Analysis: {symbol}\n\n"

        # === REAL-TIME LIVE PRICE (Show first!) ===
        if data.get("realTimePrice"):
            rtprice = data["realTimePrice"]
            formatted += "## Current Price (Live)\n"

            if rtprice.get("close"):
                formatted += f"- **Current Price: ${rtprice['close']:.2f}**\n"

            if rtprice.get("open"):
                formatted += f"- Open: ${rtprice['open']:.2f}\n"

            if rtprice.get("high"):
                formatted += f"- Day High: ${rtprice['high']:.2f}\n"

            if rtprice.get("low"):
                formatted += f"- Day Low: ${rtprice['low']:.2f}\n"

            # Calculate daily change
            if rtprice.get("change") is not None and rtprice.get("change_p") is not None:
                change = rtprice["change"]
                change_pct = rtprice["change_p"]
                formatted += f"- Day Change: {'+' if change >= 0 else ''}{change:.2f} ({'+' if change_pct >= 0 else ''}{change_pct:.2f}%)\n"

            if rtprice.get("volume"):
                formatted += f"- Volume: {rtprice['volume']:,}\n"

            # Add timestamp note
            formatted += f"- *Data delayed ~15-20 minutes*\n"

            formatted += "\n"

        # === FUNDAMENTAL DATA ===
        if data.get("fundamental") and data["fundamental"].get("Highlights"):
            f = data["fundamental"]["Highlights"]
            general = data["fundamental"].get("General", {})
            formatted += "## Fundamentals\n"
            formatted += f"- Market Cap: ${f.get('MarketCapitalization', 0) / 1e9:.2f}B\n"
            formatted += f"- P/E Ratio: {f.get('PERatio', 'N/A')}\n"
            formatted += f"- Forward P/E: {f.get('ForwardPE', 'N/A')}\n"
            formatted += f"- Profit Margin: {f.get('ProfitMargin', 0) * 100:.2f}%\n"
            formatted += f"- ROE: {f.get('ReturnOnEquityTTM', 0) * 100:.2f}%\n"
            formatted += f"- Revenue Growth: {f.get('QuarterlyRevenueGrowthYOY', 0) * 100:.2f}%\n"
            formatted += f"- Dividend Yield: {f.get('DividendYield', 0) * 100:.2f}%\n"
            if general:
                formatted += f"- Sector: {general.get('Sector', 'N/A')}\n"
                formatted += f"- Industry: {general.get('Industry', 'N/A')}\n"
            formatted += "\n"

        # === TECHNICAL INDICATORS (ENHANCED) ===
        tech = data.get("technical", {})
        if tech:
            formatted += "## Technical Indicators\n"

            # RSI
            if tech.get("rsi") and len(tech["rsi"]) > 0:
                latest_rsi = tech["rsi"][0]
                rsi_val = latest_rsi.get('rsi', 'N/A')
                formatted += f"- RSI (14): {rsi_val}"
                if rsi_val != 'N/A':
                    if rsi_val > 70:
                        formatted += " [Overbought]"
                    elif rsi_val < 30:
                        formatted += " [Oversold]"
                formatted += "\n"

            # MACD
            if tech.get("macd") and len(tech["macd"]) > 0:
                latest_macd = tech["macd"][0]
                formatted += f"- MACD: {latest_macd.get('macd', 'N/A')}\n"
                formatted += f"- Signal: {latest_macd.get('signal', 'N/A')}\n"
                macd_val = latest_macd.get('macd', 0)
                signal_val = latest_macd.get('signal', 0)
                if macd_val > signal_val:
                    formatted += f"  [Bullish Crossover]\n"
                elif macd_val < signal_val:
                    formatted += f"  [Bearish Crossover]\n"

            # Bollinger Bands
            if tech.get("bbands") and len(tech["bbands"]) > 0:
                latest_bb = tech["bbands"][0]
                formatted += f"- Bollinger Bands: Upper ${latest_bb.get('upper', 'N/A'):.2f}, "
                formatted += f"Middle ${latest_bb.get('middle', 'N/A'):.2f}, "
                formatted += f"Lower ${latest_bb.get('lower', 'N/A'):.2f}\n"

            # Stochastic
            if tech.get("stochastic") and len(tech["stochastic"]) > 0:
                latest_stoch = tech["stochastic"][0]
                k_val = latest_stoch.get('k', 'N/A')
                formatted += f"- Stochastic: K={k_val}, D={latest_stoch.get('d', 'N/A')}"
                if k_val != 'N/A':
                    if k_val > 80:
                        formatted += " [Overbought]"
                    elif k_val < 20:
                        formatted += " [Oversold]"
                formatted += "\n"

            # ATR (Volatility)
            if tech.get("atr") and len(tech["atr"]) > 0:
                latest_atr = tech["atr"][0]
                formatted += f"- ATR (14): ${latest_atr.get('atr', 'N/A'):.2f} [Volatility Measure]\n"

            # Moving Averages
            if tech.get("sma_50") and len(tech["sma_50"]) > 0:
                formatted += f"- SMA (50): ${tech['sma_50'][0].get('sma', 'N/A'):.2f}\n"
            if tech.get("sma_200") and len(tech["sma_200"]) > 0:
                formatted += f"- SMA (200): ${tech['sma_200'][0].get('sma', 'N/A'):.2f}\n"

            formatted += "\n"

        # === RECENT PRICE ACTION ===
        if data.get("recentPrice") and len(data["recentPrice"]) > 0:
            latest = data["recentPrice"][-1]
            first = data["recentPrice"][0]
            change = ((latest["close"] - first["close"]) / first["close"]) * 100
            high_52w = max([p["high"] for p in data["recentPrice"]])
            low_52w = min([p["low"] for p in data["recentPrice"]])

            formatted += "## Recent Price Action\n"
            formatted += f"- Current Price: ${latest['close']:.2f}\n"
            formatted += f"- 30-Day Change: {'+' if change >= 0 else ''}{change:.2f}%\n"
            formatted += f"- Volume: {latest.get('volume', 0):,}\n"
            formatted += f"- 52-Week Range: ${low_52w:.2f} - ${high_52w:.2f}\n\n"

        # === INTRADAY PATTERNS (Last 3 Days) ===
        if data.get("intraday") and len(data["intraday"]) > 0:
            intraday = data["intraday"]
            # Get first and last of intraday data
            first_bar = intraday[0]
            last_bar = intraday[-1]
            intraday_change = ((last_bar["close"] - first_bar["open"]) / first_bar["open"]) * 100

            # Calculate average volume
            avg_volume = sum([bar.get("volume", 0) for bar in intraday]) / len(intraday)

            formatted += "## Intraday Activity (Last 3 Days)\n"
            formatted += f"- Latest Bar: ${last_bar['close']:.2f} @ {datetime.fromtimestamp(last_bar['datetime']).strftime('%Y-%m-%d %H:%M')}\n"
            formatted += f"- 3-Day Intraday Change: {'+' if intraday_change >= 0 else ''}{intraday_change:.2f}%\n"
            formatted += f"- Avg 5min Volume: {avg_volume:,.0f}\n\n"

        # === DIVIDENDS ===
        if data.get("dividends") and len(data["dividends"]) > 0:
            recent_divs = data["dividends"][:3]  # Last 3 dividends
            formatted += "## Recent Dividends\n"
            for div in recent_divs:
                formatted += f"- {div.get('date', 'N/A')}: ${div.get('value', 0):.2f} per share\n"
            formatted += "\n"

        # === STOCK SPLITS ===
        if data.get("splits") and len(data["splits"]) > 0:
            recent_splits = data["splits"][:2]  # Last 2 splits
            formatted += "## Recent Stock Splits\n"
            for split in recent_splits:
                formatted += f"- {split.get('date', 'N/A')}: {split.get('split', 'N/A')}\n"
            formatted += "\n"

        # === EARNINGS CALENDAR ===
        if data.get("earnings"):
            earnings_data = data["earnings"]
            if isinstance(earnings_data, dict) and earnings_data.get("earnings"):
                earnings_list = earnings_data["earnings"]
                if len(earnings_list) > 0:
                    formatted += "## Upcoming Earnings\n"
                    for event in earnings_list[:3]:  # Next 3 earnings dates
                        date = event.get("date", "N/A")
                        estimate = event.get("estimate", "N/A")
                        formatted += f"- **{date}**: EPS Estimate ${estimate}"

                        # Add previous quarter surprise if available
                        if event.get("actual") and event.get("estimate"):
                            surprise = float(event["actual"]) - float(event["estimate"])
                            surprise_pct = (surprise / float(event["estimate"])) * 100 if float(event["estimate"]) != 0 else 0
                            if surprise > 0:
                                formatted += f" (Previous surprise: +{surprise_pct:.1f}%)"
                            elif surprise < 0:
                                formatted += f" (Previous surprise: {surprise_pct:.1f}%)"
                        formatted += "\n"
                    formatted += "\n"

        # === INSIDER TRANSACTIONS ===
        if data.get("insiderTransactions"):
            insider_data = data["insiderTransactions"]
            if isinstance(insider_data, dict) and insider_data.get("data"):
                transactions = insider_data["data"]
                if len(transactions) > 0:
                    formatted += "## Recent Insider Transactions\n"
                    for txn in transactions[:5]:  # Last 5 insider transactions
                        date = txn.get("date", "N/A")
                        owner = txn.get("ownerName", "Unknown")
                        transaction_type = txn.get("transactionType", "N/A")
                        shares = txn.get("transactionShares", 0)
                        price = txn.get("transactionPrice", 0)

                        # Format transaction type
                        if "Sale" in transaction_type or "Sell" in transaction_type:
                            action = "🔴 SOLD"
                        elif "Purchase" in transaction_type or "Buy" in transaction_type:
                            action = "🟢 BOUGHT"
                        else:
                            action = transaction_type

                        formatted += f"- **{date}**: {owner} {action} {shares:,} shares"
                        if price > 0:
                            formatted += f" @ ${price:.2f}"
                        formatted += "\n"
                    formatted += "\n"

        # === ENHANCED FUNDAMENTALS (Financial Statements) ===
        if data.get("fundamental"):
            fund = data["fundamental"]

            # Income Statement highlights
            if fund.get("Financials") and fund["Financials"].get("Income_Statement"):
                income = fund["Financials"]["Income_Statement"]
                if isinstance(income, dict) and income.get("quarterly"):
                    latest_quarter = list(income["quarterly"].values())[0] if income["quarterly"] else {}
                    if latest_quarter:
                        formatted += "## Latest Quarter Financials\n"
                        formatted += f"- Revenue: ${latest_quarter.get('totalRevenue', 0) / 1e9:.2f}B\n"
                        formatted += f"- Gross Profit: ${latest_quarter.get('grossProfit', 0) / 1e9:.2f}B\n"
                        formatted += f"- Operating Income: ${latest_quarter.get('operatingIncome', 0) / 1e9:.2f}B\n"
                        formatted += f"- Net Income: ${latest_quarter.get('netIncome', 0) / 1e9:.2f}B\n"
                        formatted += f"- EPS: ${latest_quarter.get('eps', 0):.2f}\n"
                        formatted += "\n"

            # Balance Sheet highlights
            if fund.get("Financials") and fund["Financials"].get("Balance_Sheet"):
                balance = fund["Financials"]["Balance_Sheet"]
                if isinstance(balance, dict) and balance.get("quarterly"):
                    latest_quarter = list(balance["quarterly"].values())[0] if balance["quarterly"] else {}
                    if latest_quarter:
                        total_assets = latest_quarter.get('totalAssets', 0)
                        total_liabilities = latest_quarter.get('totalLiab', 0)
                        cash = latest_quarter.get('cash', 0)

                        formatted += "## Balance Sheet\n"
                        formatted += f"- Total Assets: ${total_assets / 1e9:.2f}B\n"
                        formatted += f"- Total Liabilities: ${total_liabilities / 1e9:.2f}B\n"
                        formatted += f"- Cash & Equivalents: ${cash / 1e9:.2f}B\n"
                        if total_assets > 0:
                            debt_ratio = (total_liabilities / total_assets) * 100
                            formatted += f"- Debt-to-Assets Ratio: {debt_ratio:.1f}%\n"
                        formatted += "\n"

            # Institutional Ownership
            if fund.get("Holders") and fund["Holders"].get("Institutions"):
                institutions = fund["Holders"]["Institutions"]
                if len(institutions) > 0:
                    formatted += "## Top Institutional Holders\n"
                    for holder in institutions[:5]:
                        name = holder.get("name", "Unknown")
                        shares = holder.get("totalShares", 0)
                        pct = holder.get("totalAssets", 0)
                        formatted += f"- {name}: {shares:,} shares ({pct:.2f}% of portfolio)\n"
                    formatted += "\n"

        # === NEWS HEADLINES ===
        if data.get("news") and len(data["news"]) > 0:
            formatted += "## Recent News\n"
            for article in data["news"][:5]:
                sentiment = article.get('sentiment', {})
                sentiment_label = ""
                if sentiment and 'polarity' in sentiment:
                    polarity = sentiment['polarity']
                    if polarity > 0.3:
                        sentiment_label = " [Positive]"
                    elif polarity < -0.3:
                        sentiment_label = " [Negative]"
                formatted += f"- {article.get('title', '')}{sentiment_label} ({article.get('date', '')})\n"
            formatted += "\n"

        return formatted

    async def fetch_exchange_details(self, exchange: str = "US") -> Dict[str, Any]:
        """Fetch exchange trading hours and calendar"""
        cache_key = f"exchange-{exchange}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/exchange-details/{exchange}",
                    params={"api_token": self.eodhd_api_key, "fmt": "json"}
                )

                if response.status_code == 200:
                    result = response.json()
                    self._set_cache(cache_key, result)
                    return result
                else:
                    return {}

        except Exception as e:
            print(f"Error fetching exchange details: {e}")
            return {}

    async def fetch_crypto_fundamentals(self, symbol: str) -> Dict[str, Any]:
        """Fetch crypto-specific fundamental data and real-time price"""
        cache_key = f"crypto-{symbol}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        ticker = f"{symbol}-USD.CC"  # Crypto suffix with USD pair
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Fetch both fundamentals and real-time price in parallel
                fundamentals_req = client.get(
                    f"{self.base_url}/fundamentals/{ticker}",
                    params={"api_token": self.eodhd_api_key, "fmt": "json"}
                )
                realtime_req = client.get(
                    f"{self.base_url}/real-time/{ticker}",
                    params={"api_token": self.eodhd_api_key, "fmt": "json"}
                )

                results = await asyncio.gather(fundamentals_req, realtime_req, return_exceptions=True)

                fundamentals_data = {}
                realtime_data = {}

                if not isinstance(results[0], Exception) and results[0].status_code == 200:
                    fundamentals_data = results[0].json()

                if not isinstance(results[1], Exception) and results[1].status_code == 200:
                    realtime_data = results[1].json()

                # Combine both data sources
                combined_data = fundamentals_data.copy()
                if realtime_data:
                    combined_data["RealTimePrice"] = realtime_data

                self._set_cache(cache_key, combined_data)
                return combined_data

        except Exception as e:
            print(f"Error fetching crypto fundamentals: {e}")
            return {}

    async def search_ticker(self, query: str) -> Optional[Dict[str, Any]]:
        """Search for ticker by symbol, name, or ISIN"""
        cache_key = f"search-{query.lower()}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/search/{query}",
                    params={"api_token": self.eodhd_api_key, "limit": 5, "fmt": "json"}
                )

                if response.status_code == 200:
                    results = response.json()
                    if results and len(results) > 0:
                        # Return best match (first result)
                        best_match = results[0]
                        self._set_cache(cache_key, best_match)
                        return best_match
                    return None
                else:
                    return None

        except Exception as e:
            print(f"Error searching ticker: {e}")
            return None

    async def fetch_economic_calendar(self, country: str = "US", days_ahead: int = 14) -> Dict[str, Any]:
        """Fetch upcoming economic events"""
        cache_key = f"economic-calendar-{country}-{days_ahead}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        today = datetime.now().strftime("%Y-%m-%d")
        future_date = (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%d")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/economic-events",
                    params={
                        "api_token": self.eodhd_api_key,
                        "from": today,
                        "to": future_date,
                        "country": country,
                        "fmt": "json"
                    }
                )

                if response.status_code == 200:
                    result = response.json()
                    self._set_cache(cache_key, result)
                    return result
                else:
                    return {}

        except Exception as e:
            print(f"Error fetching economic calendar: {e}")
            return {}

    async def fetch_forex_data(self, pair: str) -> Dict[str, Any]:
        """Fetch forex pair data"""
        cache_key = f"forex-{pair}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        ticker = f"{pair}.FOREX"
        today = datetime.now().strftime("%Y-%m-%d")
        thirty_days_ago = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Fetch historical data (last 30 days)
                response = await client.get(
                    f"{self.base_url}/eod/{ticker}",
                    params={
                        "api_token": self.eodhd_api_key,
                        "from": thirty_days_ago,
                        "to": today,
                        "period": "d",
                        "fmt": "json"
                    }
                )

                if response.status_code == 200:
                    result = response.json()
                    self._set_cache(cache_key, result)
                    return result
                else:
                    return []

        except Exception as e:
            print(f"Error fetching forex data: {e}")
            return []

    async def fetch_bond_data(self, country: str, period: str) -> Dict[str, Any]:
        """Fetch government bond yield data"""
        cache_key = f"bond-{country}-{period}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        ticker = f"{country}{period}.GBOND"
        today = datetime.now().strftime("%Y-%m-%d")
        six_months_ago = (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/eod/{ticker}",
                    params={
                        "api_token": self.eodhd_api_key,
                        "from": six_months_ago,
                        "to": today,
                        "period": "d",
                        "fmt": "json"
                    }
                )

                if response.status_code == 200:
                    result = response.json()
                    self._set_cache(cache_key, result)
                    return result
                else:
                    return []

        except Exception as e:
            print(f"Error fetching bond data: {e}")
            return []

    async def find_similar_stocks(self, symbol: str, sector: str = None, market_cap: float = None) -> Dict[str, Any]:
        """Use Stock Screener API to find similar stocks"""
        cache_key = f"similar-{symbol}"
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        # Build filters for similar stocks
        filters = []

        if sector:
            filters.append(["sector", "=", sector])

        if market_cap:
            # Find stocks with similar market cap (±50%)
            min_cap = market_cap * 0.5
            max_cap = market_cap * 1.5
            filters.append(["market_capitalization", ">=", str(int(min_cap))])
            filters.append(["market_capitalization", "<=", str(int(max_cap))])

        # Exclude the current symbol
        filters.append(["code", "!=", symbol])

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/screener",
                    params={"api_token": self.eodhd_api_key},
                    json={
                        "filters": filters,
                        "sort": "market_capitalization.desc",
                        "limit": 5
                    }
                )

                if response.status_code == 200:
                    result = response.json()
                    self._set_cache(cache_key, result)
                    return result
                else:
                    return {"data": []}

        except Exception as e:
            print(f"Error fetching similar stocks: {e}")
            return {"data": []}

    def format_similar_stocks(self, similar_stocks: Dict[str, Any]) -> str:
        """Format similar stocks data"""
        if not similar_stocks or not similar_stocks.get("data"):
            return ""

        formatted = "## Similar/Peer Stocks\n"
        for stock in similar_stocks["data"][:5]:
            formatted += f"- {stock.get('code', 'N/A')} ({stock.get('name', 'N/A')}): "
            formatted += f"${stock.get('market_capitalization', 0) / 1e9:.2f}B market cap, "
            formatted += f"P/E: {stock.get('pe_ratio', 'N/A')}\n"
        formatted += "\n"
        return formatted

    def format_exchange_details(self, exchange_data: Dict[str, Any]) -> str:
        """Format exchange trading hours and calendar"""
        if not exchange_data:
            return ""

        formatted = "## Exchange Information\n"

        if exchange_data.get("Name"):
            formatted += f"- Exchange: {exchange_data['Name']}\n"

        if exchange_data.get("OperatingMIC"):
            formatted += f"- MIC Code: {exchange_data['OperatingMIC']}\n"

        if exchange_data.get("Country"):
            formatted += f"- Country: {exchange_data['Country']}\n"

        if exchange_data.get("Currency"):
            formatted += f"- Currency: {exchange_data['Currency']}\n"

        if exchange_data.get("TradingHours"):
            hours = exchange_data["TradingHours"]
            formatted += f"- Trading Hours: {hours} (local time)\n"

        if exchange_data.get("Holidays"):
            holidays = exchange_data["Holidays"]
            upcoming = [h for h in holidays if h > datetime.now().strftime("%Y-%m-%d")][:3]
            if upcoming:
                formatted += f"- Upcoming Holidays: {', '.join(upcoming)}\n"

        formatted += "\n"
        return formatted

    def format_crypto_fundamentals(self, symbol: str, crypto_data: Dict[str, Any]) -> str:
        """Format crypto-specific fundamental data"""
        if not crypto_data:
            return ""

        formatted = f"# Crypto Analysis: {symbol}\n\n"

        # Real-time price data (if available)
        if crypto_data.get("RealTimePrice"):
            rtprice = crypto_data["RealTimePrice"]
            formatted += "## Current Price\n"

            if rtprice.get("close"):
                formatted += f"- **Current Price: ${rtprice['close']:,.2f}**\n"

            if rtprice.get("open"):
                formatted += f"- Open: ${rtprice['open']:,.2f}\n"

            if rtprice.get("high"):
                formatted += f"- 24h High: ${rtprice['high']:,.2f}\n"

            if rtprice.get("low"):
                formatted += f"- 24h Low: ${rtprice['low']:,.2f}\n"

            # Calculate 24h change
            if rtprice.get("close") and rtprice.get("previousClose"):
                change = rtprice["close"] - rtprice["previousClose"]
                change_pct = (change / rtprice["previousClose"]) * 100
                formatted += f"- 24h Change: {'+' if change >= 0 else ''}{change:,.2f} ({'+' if change_pct >= 0 else ''}{change_pct:.2f}%)\n"

            formatted += "\n"

        if crypto_data.get("General"):
            general = crypto_data["General"]
            formatted += "## Crypto Information\n"
            formatted += f"- Name: {general.get('Name', 'N/A')}\n"
            formatted += f"- Type: {general.get('Type', 'N/A')}\n"
            formatted += f"- Category: {general.get('Category', 'N/A')}\n"

            if general.get("Description"):
                desc = general["Description"][:200] + "..." if len(general["Description"]) > 200 else general["Description"]
                formatted += f"- Description: {desc}\n"

            formatted += "\n"

        # Statistics section (not Technicals)
        if crypto_data.get("Statistics"):
            stats = crypto_data["Statistics"]
            formatted += "## Token Metrics\n"

            if stats.get("TotalSupply"):
                formatted += f"- Total Supply: {stats['TotalSupply']:,}\n"

            if stats.get("CirculatingSupply"):
                formatted += f"- Circulating Supply: {stats['CirculatingSupply']:,}\n"

            if stats.get("MaxSupply"):
                formatted += f"- Max Supply: {stats['MaxSupply']:,}\n"

            formatted += "\n"

            # Market data from Statistics
            formatted += "## Market Data\n"
            if stats.get("MarketCapitalization"):
                formatted += f"- Market Cap: ${stats['MarketCapitalization'] / 1e9:.2f}B\n"

            if stats.get("MarketCapDominance"):
                formatted += f"- Market Dominance: {stats['MarketCapDominance']:.2f}%\n"

            if stats.get("HighAllTime"):
                formatted += f"- All-Time High: ${stats['HighAllTime']:,.2f}\n"

            if stats.get("LowAllTime"):
                formatted += f"- All-Time Low: ${stats['LowAllTime']:,.2f}\n"

            formatted += "\n"

        return formatted

    def format_economic_calendar(self, events_data: Any, country: str) -> str:
        """Format economic calendar events"""
        if not events_data:
            return f"# Economic Calendar - {country}\n\nNo upcoming events found.\n"

        formatted = f"# Economic Calendar - {country}\n\n"

        # Handle different response formats
        events_list = []
        if isinstance(events_data, list):
            events_list = events_data
        elif isinstance(events_data, dict):
            # Flatten nested structure if needed
            for date_key, date_events in events_data.items():
                if isinstance(date_events, list):
                    events_list.extend(date_events)
                elif isinstance(date_events, dict):
                    events_list.append(date_events)

        if not events_list or len(events_list) == 0:
            return formatted + "No upcoming events found.\n"

        formatted += "## Upcoming Economic Events\n\n"

        # Group by date (extract date part only, remove time)
        events_by_date = {}
        for event in events_list[:30]:  # Limit to 30 events
            date_str = event.get("date", "Unknown")
            # Extract just the date part (YYYY-MM-DD)
            if date_str != "Unknown" and " " in date_str:
                date_part = date_str.split(" ")[0]
            else:
                date_part = date_str

            if date_part not in events_by_date:
                events_by_date[date_part] = []
            events_by_date[date_part].append(event)

        # Format by date
        dates_shown = 0
        for date in sorted(events_by_date.keys()):
            if dates_shown >= 7:  # Show max 7 days
                break

            formatted += f"### {date}\n"
            for event in events_by_date[date][:10]:  # Max 10 events per day
                # Get event name from "type" field
                event_name = event.get("type", event.get("event", event.get("name", "Unknown Event")))
                formatted += f"- **{event_name}**"

                # Add period if available
                if event.get("period"):
                    formatted += f" ({event['period']})"

                # Add values if available
                parts = []
                if event.get("estimate") is not None:
                    parts.append(f"Est: {event['estimate']}")
                if event.get("previous") is not None:
                    parts.append(f"Prev: {event['previous']}")
                if event.get("actual") is not None:
                    parts.append(f"Actual: {event['actual']}")

                if parts:
                    formatted += f" [{', '.join(parts)}]"

                formatted += "\n"
            formatted += "\n"
            dates_shown += 1

        return formatted

    def format_forex_context(self, pair: str, forex_data: List[Dict[str, Any]]) -> str:
        """Format forex pair data"""
        if not forex_data or len(forex_data) == 0:
            return ""

        formatted = f"# Forex Analysis: {pair}\n\n"

        # Latest price
        latest = forex_data[-1]
        first = forex_data[0]

        current_rate = latest.get("close", 0)
        thirty_day_change = ((current_rate - first.get("close", current_rate)) / first.get("close", 1)) * 100

        formatted += "## Current Rate\n"
        formatted += f"- Exchange Rate: {current_rate:.5f}\n"
        formatted += f"- 30-Day Change: {'+' if thirty_day_change >= 0 else ''}{thirty_day_change:.2f}%\n"

        # High/Low
        if len(forex_data) > 1:
            high_30d = max([d.get("high", 0) for d in forex_data])
            low_30d = min([d.get("low", current_rate) for d in forex_data])
            formatted += f"- 30-Day High: {high_30d:.5f}\n"
            formatted += f"- 30-Day Low: {low_30d:.5f}\n"

        formatted += "\n"

        # Recent trend
        if len(forex_data) >= 7:
            week_ago = forex_data[-7]
            week_change = ((current_rate - week_ago.get("close", current_rate)) / week_ago.get("close", 1)) * 100
            formatted += "## Recent Trend\n"
            formatted += f"- 7-Day Change: {'+' if week_change >= 0 else ''}{week_change:.2f}%\n"

            if week_change > 1:
                formatted += f"- Trend: Strengthening (Base currency appreciating)\n"
            elif week_change < -1:
                formatted += f"- Trend: Weakening (Base currency depreciating)\n"
            else:
                formatted += f"- Trend: Stable\n"

            formatted += "\n"

        return formatted

    def format_bond_context(self, country: str, period: str, bond_data: List[Dict[str, Any]]) -> str:
        """Format government bond yield data"""
        if not bond_data or len(bond_data) == 0:
            return ""

        country_names = {
            'US': 'United States',
            'GB': 'United Kingdom',
            'DE': 'Germany',
            'JP': 'Japan',
            'FR': 'France'
        }
        country_name = country_names.get(country, country)

        formatted = f"# Government Bond: {country_name} {period}\n\n"

        # Latest yield
        latest = bond_data[-1]
        first = bond_data[0]

        current_yield = latest.get("close", 0)
        six_month_change = current_yield - first.get("close", current_yield)

        formatted += "## Current Yield\n"
        formatted += f"- Yield: {current_yield:.3f}%\n"
        formatted += f"- 6-Month Change: {'+' if six_month_change >= 0 else ''}{six_month_change:.3f}%\n"

        # High/Low
        if len(bond_data) > 1:
            high_6m = max([d.get("high", 0) for d in bond_data])
            low_6m = min([d.get("low", current_yield) for d in bond_data])
            formatted += f"- 6-Month High: {high_6m:.3f}%\n"
            formatted += f"- 6-Month Low: {low_6m:.3f}%\n"

        formatted += "\n"

        # Recent trend
        if len(bond_data) >= 30:
            month_ago = bond_data[-30]
            month_change = current_yield - month_ago.get("close", current_yield)
            formatted += "## Recent Trend\n"
            formatted += f"- 30-Day Change: {'+' if month_change >= 0 else ''}{month_change:.3f}%\n"

            if month_change > 0.25:
                formatted += f"- Trend: Rising yields (bond prices falling)\n"
            elif month_change < -0.25:
                formatted += f"- Trend: Falling yields (bond prices rising)\n"
            else:
                formatted += f"- Trend: Stable\n"

            formatted += "\n"

        return formatted

    def is_crypto_symbol(self, message: str) -> Optional[str]:
        """Detect if message contains crypto symbols (returns first match for backwards compatibility)"""
        cryptos = self.extract_crypto_symbols(message)
        return cryptos[0] if cryptos else None

    def extract_crypto_symbols(self, message: str) -> List[str]:
        """Extract all crypto symbols from message"""
        crypto_keywords = [
            'bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'cryptocurrency',
            'dogecoin', 'doge', 'cardano', 'ada', 'solana', 'sol'
        ]
        message_lower = message.lower()

        # Map common names to symbols
        symbol_map = {
            'bitcoin': 'BTC', 'btc': 'BTC',
            'ethereum': 'ETH', 'eth': 'ETH',
            'dogecoin': 'DOGE', 'doge': 'DOGE',
            'cardano': 'ADA', 'ada': 'ADA',
            'solana': 'SOL', 'sol': 'SOL',
        }

        found_symbols = []
        for keyword in crypto_keywords:
            if keyword in message_lower and keyword in symbol_map:
                symbol = symbol_map[keyword]
                if symbol not in found_symbols:  # Avoid duplicates
                    found_symbols.append(symbol)

        return found_symbols

    def is_forex_query(self, message: str) -> bool:
        """Detect if message is asking about forex/currency pairs"""
        forex_keywords = [
            'forex', 'currency', 'exchange rate', 'fx',
            'eur/usd', 'gbp/usd', 'usd/jpy', 'aud/usd',
            'eurusd', 'gbpusd', 'usdjpy', 'audusd',
            'dollar', 'euro', 'pound', 'yen'
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in forex_keywords)

    def extract_forex_pair(self, message: str) -> Optional[str]:
        """Extract forex pair from message"""
        message_upper = message.upper()

        # Pattern 1: EUR/USD format
        import re
        slash_pattern = r'([A-Z]{3})/([A-Z]{3})'
        match = re.search(slash_pattern, message_upper)
        if match:
            return f"{match.group(1)}{match.group(2)}"

        # Pattern 2: EURUSD format
        pair_pattern = r'\b([A-Z]{6})\b'
        match = re.search(pair_pattern, message_upper)
        if match:
            pair = match.group(1)
            # Validate it's a known currency pair pattern
            if pair[:3] in ['EUR', 'USD', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']:
                return pair

        # Default common pairs based on keywords
        keyword_pairs = {
            'euro': 'EURUSD',
            'pound': 'GBPUSD',
            'yen': 'USDJPY',
            'aussie': 'AUDUSD',
            'australian': 'AUDUSD',
        }
        message_lower = message.lower()
        for keyword, pair in keyword_pairs.items():
            if keyword in message_lower:
                return pair

        # Default to EURUSD if forex detected but no specific pair
        return 'EURUSD'

    def is_bond_query(self, message: str) -> bool:
        """Detect if message is asking about government bonds"""
        bond_keywords = [
            'treasury', 'bond', 'yield', '10-year', '10 year',
            '2-year', '2 year', '30-year', '30 year',
            'government bond', 't-bill', 'tbill'
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in bond_keywords)

    def extract_bond_params(self, message: str) -> tuple[str, str]:
        """Extract country and period from bond query"""
        message_lower = message.lower()

        # Extract period
        period = '10Y'  # Default
        if '2-year' in message_lower or '2 year' in message_lower:
            period = '2Y'
        elif '5-year' in message_lower or '5 year' in message_lower:
            period = '5Y'
        elif '10-year' in message_lower or '10 year' in message_lower:
            period = '10Y'
        elif '30-year' in message_lower or '30 year' in message_lower:
            period = '30Y'

        # Extract country
        country = 'US'  # Default
        if 'german' in message_lower or 'germany' in message_lower:
            country = 'DE'
        elif 'uk' in message_lower or 'british' in message_lower or 'britain' in message_lower:
            country = 'GB'
        elif 'japan' in message_lower or 'japanese' in message_lower:
            country = 'JP'
        elif 'france' in message_lower or 'french' in message_lower:
            country = 'FR'

        return country, period

    def has_economic_calendar_intent(self, message: str) -> bool:
        """Detect if message is asking about economic calendar/events"""
        calendar_keywords = [
            'economic calendar', 'economic data', 'economic events',
            'economic report', 'gdp', 'inflation', 'cpi', 'pmi',
            'employment', 'jobs report', 'fed meeting', 'fomc',
            'retail sales', 'what data', "what's coming out"
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in calendar_keywords)

    async def detect_and_fetch_context(
        self,
        message: str,
        previous_context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Detect context needs and fetch relevant data"""

        # Priority 1: Economic Calendar Intent
        if self.has_economic_calendar_intent(message):
            # Extract country if mentioned
            message_lower = message.lower()
            country = "US"  # Default
            if "europe" in message_lower or "eu" in message_lower:
                country = "EU"
            elif "uk" in message_lower or "britain" in message_lower:
                country = "GB"
            elif "japan" in message_lower:
                country = "JP"

            events_data = await self.fetch_economic_calendar(country, days_ahead=14)
            formatted_context = self.format_economic_calendar(events_data, country)

            return {
                "type": "economic_calendar",
                "country": country,
                "data": events_data,
                "sources": ["Economic Calendar"],
                "formatted": formatted_context
            }

        # Priority 2: Forex Intent
        if self.is_forex_query(message):
            pair = self.extract_forex_pair(message)
            if pair:
                forex_data = await self.fetch_forex_data(pair)
                formatted_context = self.format_forex_context(pair, forex_data)

                return {
                    "type": "forex",
                    "symbol": pair,
                    "data": forex_data,
                    "sources": ["Forex Data"],
                    "formatted": formatted_context
                }

        # Priority 3: Bond Intent
        if self.is_bond_query(message):
            country, period = self.extract_bond_params(message)
            bond_data = await self.fetch_bond_data(country, period)
            formatted_context = self.format_bond_context(country, period, bond_data)

            return {
                "type": "bond",
                "symbol": f"{country}{period}",
                "data": bond_data,
                "sources": ["Government Bonds"],
                "formatted": formatted_context
            }

        # Priority 4: Crypto symbols (handle multiple cryptos for comparison)
        crypto_symbols = self.extract_crypto_symbols(message)
        if crypto_symbols:
            # If multiple cryptos detected, fetch data for all
            if len(crypto_symbols) > 1:
                # Fetch data for all cryptos in parallel
                crypto_data_list = await asyncio.gather(
                    *[self.fetch_crypto_fundamentals(symbol) for symbol in crypto_symbols],
                    return_exceptions=True
                )

                # Format each crypto's data
                formatted_context = ""
                for i, symbol in enumerate(crypto_symbols):
                    if not isinstance(crypto_data_list[i], Exception):
                        formatted_context += self.format_crypto_fundamentals(symbol, crypto_data_list[i])
                        formatted_context += "\n---\n\n"  # Separator between cryptos

                return {
                    "type": "crypto_comparison",
                    "symbols": crypto_symbols,
                    "data": dict(zip(crypto_symbols, crypto_data_list)),
                    "sources": ["Crypto Fundamentals"],
                    "formatted": formatted_context
                }
            else:
                # Single crypto
                crypto_symbol = crypto_symbols[0]
                crypto_data = await self.fetch_crypto_fundamentals(crypto_symbol)
                formatted_context = self.format_crypto_fundamentals(crypto_symbol, crypto_data)

                return {
                    "type": "crypto",
                    "symbol": crypto_symbol,
                    "data": crypto_data,
                    "sources": ["Crypto Fundamentals"],
                    "formatted": formatted_context
                }

        # Priority 5: Stock symbols - Try Search API first for better detection
        symbols = self.extract_symbols(message)
        if not symbols:
            # Try searching by company name (e.g., "Apple", "Microsoft")
            words = message.split()
            for word in words:
                if len(word) > 3 and word[0].isupper():  # Potential company name
                    search_result = await self.search_ticker(word)
                    if search_result:
                        symbols = [search_result.get("Code", "")]
                        break

        if symbols:
            symbol = symbols[0]  # Use first detected symbol

            # Use Search API to validate and get asset type
            search_result = await self.search_ticker(symbol)

            if search_result:
                asset_type = search_result.get("Type", "").lower()
                exchange = search_result.get("Exchange", "US")

                # Route based on asset type from search
                if "crypto" in asset_type:
                    crypto_symbol = symbol
                    crypto_data = await self.fetch_crypto_fundamentals(crypto_symbol)
                    formatted_context = self.format_crypto_fundamentals(crypto_symbol, crypto_data)
                    return {
                        "type": "crypto",
                        "symbol": crypto_symbol,
                        "data": crypto_data,
                        "sources": ["Crypto Fundamentals"],
                        "formatted": formatted_context
                    }

            # Default to stock analysis
            # Detect user intent for smart API selection
            intent = self.detect_stock_intent(message)
            insights = await self.fetch_stock_insights(symbol, intent=intent)
            sources = []

            # Add sources
            if insights.get("realTimePrice"):
                sources.append("Real-Time Price")
            if insights.get("technical"):
                sources.append("Technical Indicators")
            if insights.get("fundamental"):
                sources.append("Fundamentals")
            if insights.get("news"):
                sources.append("News")
            if insights.get("recentPrice"):
                sources.append("Historical Prices")
            if insights.get("dividends"):
                sources.append("Dividends")
            if insights.get("splits"):
                sources.append("Stock Splits")
            if insights.get("intraday"):
                sources.append("Intraday Data")
            if insights.get("earnings"):
                sources.append("Earnings Calendar")
            if insights.get("insiderTransactions"):
                sources.append("Insider Transactions")

            # Check if user wants peer comparison
            wants_comparison = any(word in message.lower() for word in [
                "similar", "peer", "compare", "competitor", "alternative"
            ])

            formatted_context = self.format_stock_context(symbol.upper(), insights)

            # Fetch similar stocks if requested or if we have sector info
            if wants_comparison and insights.get("fundamental"):
                general = insights["fundamental"].get("General", {})
                highlights = insights["fundamental"].get("Highlights", {})
                sector = general.get("Sector")
                market_cap = highlights.get("MarketCapitalization")

                if sector:
                    similar = await self.find_similar_stocks(symbol, sector, market_cap)
                    formatted_context += self.format_similar_stocks(similar)
                    sources.append("Peer Comparison")

            # Check if user wants exchange info
            wants_exchange_info = any(word in message.lower() for word in [
                "trading hours", "market hours", "exchange", "holiday", "closed"
            ])

            if wants_exchange_info:
                exchange_data = await self.fetch_exchange_details("US")
                formatted_context += self.format_exchange_details(exchange_data)
                sources.append("Exchange Info")

            return {
                "type": "stock",
                "symbol": symbol.upper(),
                "data": insights,
                "sources": sources,
                "formatted": formatted_context
            }

        # Check for portfolio intent
        if self.has_portfolio_intent(message):
            return {
                "type": "portfolio",
                "data": None,
                "sources": ["Portfolio"],
                "formatted": "# Portfolio\nNo portfolio data available in backend.\n"
            }

        # Check for market intent
        if self.has_market_intent(message):
            # Fetch market indices
            return {
                "type": "market",
                "data": None,
                "sources": ["Market Indices"],
                "formatted": "# Market Overview\nFetching market data...\n"
            }

        # General conversation
        return {
            "type": "general",
            "data": None,
            "sources": [],
            "formatted": ""
        }


# Import asyncio at module level
import asyncio
