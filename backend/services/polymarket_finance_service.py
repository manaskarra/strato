"""
Polymarket Finance Service - Fetches live prediction market data from Polymarket Gamma API
across 4 finance categories: Stocks, Earnings, Indices, Fed Rates
"""
import asyncio
import json
import httpx
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


CATEGORY_SLUGS = {
    "stocks": "stocks",
    "earnings": "earnings",
    "indices": "indicies",  # Polymarket's misspelling
    "fed-rates": "fed-rates",
}


class PolymarketFinanceService:
    def __init__(self):
        self.base_url = "https://gamma-api.polymarket.com"
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

    def _parse_outcome_prices(self, prices_str: str) -> List[float]:
        try:
            prices = json.loads(prices_str) if isinstance(prices_str, str) else prices_str
            return [float(p) for p in prices]
        except (json.JSONDecodeError, ValueError, TypeError):
            return []

    def _parse_event(self, event: Dict) -> Dict[str, Any]:
        markets = []
        for m in event.get("markets", []):
            prices = self._parse_outcome_prices(m.get("outcomePrices", "[]"))
            outcomes = m.get("outcomes", ["Yes", "No"])
            if isinstance(outcomes, str):
                try:
                    outcomes = json.loads(outcomes)
                except (json.JSONDecodeError, ValueError):
                    outcomes = ["Yes", "No"]
            markets.append({
                "question": m.get("question", ""),
                "outcomes": outcomes,
                "prices": prices,
                "volume": float(m.get("volume", 0) or 0),
                "end_date": m.get("endDate", ""),
            })

        return {
            "id": str(event.get("id", "")),
            "title": event.get("title", ""),
            "image": event.get("image", ""),
            "icon": event.get("icon", ""),
            "slug": event.get("slug", ""),
            "volume": float(event.get("volume", 0) or 0),
            "volume24hr": float(event.get("volume24hr", 0) or 0),
            "liquidity": float(event.get("liquidity", 0) or 0),
            "markets": markets,
        }

    async def fetch_category(self, category: str) -> List[Dict[str, Any]]:
        tag_slug = CATEGORY_SLUGS.get(category)
        if not tag_slug:
            return []

        cache_key = f"polymarket-finance-{category}"
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{self.base_url}/events",
                    params={
                        "closed": "false",
                        "active": "true",
                        "tag_slug": tag_slug,
                        "limit": 50,
                        "order": "volume24hr",
                        "ascending": "false",
                    },
                )
                logger.info(f"Polymarket API response for {category}: status={response.status_code}")
                if response.status_code == 200:
                    events = response.json()
                    logger.info(f"Fetched {len(events)} events for category {category}")
                    parsed = [self._parse_event(e) for e in events]
                    self._set_cache(cache_key, parsed)
                    return parsed
                else:
                    logger.warning(f"Polymarket API returned {response.status_code} for {category}: {response.text[:200]}")
                return []
        except Exception as e:
            logger.error(f"Error fetching Polymarket category {category}: {str(e)}", exc_info=True)
            return []

    async def get_all_categories(self) -> Dict[str, List[Dict[str, Any]]]:
        cache_key = "polymarket-finance-all"
        cached = self._get_from_cache(cache_key)
        if cached is not None:
            return cached

        results = await asyncio.gather(
            self.fetch_category("stocks"),
            self.fetch_category("earnings"),
            self.fetch_category("indices"),
            self.fetch_category("fed-rates"),
            return_exceptions=True,
        )

        data = {
            "stocks": results[0] if not isinstance(results[0], Exception) else [],
            "earnings": results[1] if not isinstance(results[1], Exception) else [],
            "indices": results[2] if not isinstance(results[2], Exception) else [],
            "fed-rates": results[3] if not isinstance(results[3], Exception) else [],
        }

        self._set_cache(cache_key, data)
        return data
