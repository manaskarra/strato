"""
EODHD Service - Handles communication with EODHD API
"""
import httpx
from datetime import datetime, timedelta
from config import settings


class EODHDService:
    def __init__(self):
        self.base_url = settings.eodhd_base_url
        self.api_key = settings.eodhd_api_key

    async def fetch_technical_analysis(self, symbol: str, exchange: str = "US"):
        """Fetch technical indicators (RSI, MACD, SMA)"""
        ticker = f"{symbol}.{exchange}"
        today = datetime.now().strftime("%Y-%m-%d")
        six_months_ago = (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d")

        async with httpx.AsyncClient(timeout=30.0) as client:
            # Fetch RSI, MACD, SMA in parallel
            rsi_url = f"{self.base_url}/technical/{ticker}?function=rsi&period=14&from={six_months_ago}&to={today}&order=d&api_token={self.api_key}&fmt=json"
            macd_url = f"{self.base_url}/technical/{ticker}?function=macd&fast_period=12&slow_period=26&signal_period=9&from={six_months_ago}&to={today}&order=d&api_token={self.api_key}&fmt=json"
            sma_url = f"{self.base_url}/technical/{ticker}?function=sma&period=50&from={six_months_ago}&to={today}&order=d&api_token={self.api_key}&fmt=json"

            responses = await asyncio.gather(
                client.get(rsi_url),
                client.get(macd_url),
                client.get(sma_url),
                return_exceptions=True,
            )

            return {
                "rsi": responses[0].json() if not isinstance(responses[0], Exception) else [],
                "macd": responses[1].json() if not isinstance(responses[1], Exception) else [],
                "sma": responses[2].json() if not isinstance(responses[2], Exception) else [],
            }

    async def fetch_fundamental_analysis(self, symbol: str, exchange: str = "US"):
        """Fetch fundamental data"""
        ticker = f"{symbol}.{exchange}"
        url = f"{self.base_url}/fundamentals/{ticker}?api_token={self.api_key}&fmt=json"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

            if not data or "Highlights" not in data:
                return None

            return {
                "symbol": symbol,
                "name": data.get("General", {}).get("Name", symbol),
                "marketCap": data["Highlights"].get("MarketCapitalization", 0),
                "peRatio": data["Highlights"].get("PERatio", 0),
                "forwardPE": data.get("Valuation", {}).get("ForwardPE", 0),
                "profitMargin": data["Highlights"].get("ProfitMargin", 0),
                "operatingMargin": data["Highlights"].get("OperatingMarginTTM", 0),
                "revenueTTM": data["Highlights"].get("RevenueTTM", 0),
                "revenueGrowth": data["Highlights"].get("QuarterlyRevenueGrowthYOY", 0),
                "roe": data["Highlights"].get("ReturnOnEquityTTM", 0),
                "roa": data["Highlights"].get("ReturnOnAssetsTTM", 0),
            }

    async def fetch_news(self, symbol: str, exchange: str = "US", limit: int = 20):
        """Fetch news articles"""
        # Use full ticker format for news filtering
        ticker = f"{symbol}.{exchange}"
        today = datetime.now().strftime("%Y-%m-%d")
        one_week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")

        # EODHD news API - filter by ticker symbol
        url = f"{self.base_url}/news?s={ticker}&offset=0&limit={limit}&from={one_week_ago}&to={today}&api_token={self.api_key}&fmt=json"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            news_data = response.json()

            # Additional filtering to ensure we only return news for the requested symbol
            if isinstance(news_data, list):
                filtered_news = []
                symbol_upper = symbol.upper()
                ticker_upper = ticker.upper()

                for article in news_data:
                    # Get the symbols field (it's an array/list, not a string)
                    article_symbols = article.get('symbols', [])

                    # Check if our symbol is in the article's symbols array
                    if isinstance(article_symbols, list):
                        # Convert all symbols to uppercase for comparison
                        symbols_list = [s.strip().upper() for s in article_symbols]
                        if symbol_upper in symbols_list or ticker_upper in symbols_list:
                            filtered_news.append(article)
                    # Also check title for symbol mention as fallback
                    elif symbol_upper in article.get('title', '').upper():
                        filtered_news.append(article)

                # Return filtered results (or empty list if none match)
                return filtered_news[:limit]

            return news_data

    async def fetch_chart_data(self, symbol: str, exchange: str = "US", interval: str = "5m"):
        """Fetch intraday chart data"""
        ticker = f"{symbol}.{exchange}"
        now = int(datetime.now().timestamp())
        one_day_ago = now - (24 * 60 * 60)

        url = f"{self.base_url}/intraday/{ticker}?interval={interval}&from={one_day_ago}&to={now}&api_token={self.api_key}&fmt=json"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()

    async def fetch_historical_data(self, symbol: str, exchange: str = "US", period: str = "year"):
        """Fetch historical EOD data"""
        ticker = f"{symbol}.{exchange}"
        today = datetime.now().strftime("%Y-%m-%d")

        period_days = {"month": 30, "quarter": 90, "year": 365}
        days_ago = period_days.get(period, 365)
        from_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")

        url = f"{self.base_url}/eod/{ticker}?from={from_date}&to={today}&period=d&api_token={self.api_key}&fmt=json"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

            # Convert to OHLCV format
            return [
                {
                    "datetime": int(datetime.strptime(item["date"], "%Y-%m-%d").timestamp()),
                    "open": item["open"],
                    "high": item["high"],
                    "low": item["low"],
                    "close": item["close"],
                    "volume": item["volume"],
                }
                for item in data
            ]


import asyncio  # Add this import at the top
