# This is the new smart fetch_stock_insights method
# Replace the existing one with this

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
