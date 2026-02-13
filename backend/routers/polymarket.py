"""
Polymarket Router - Serves live finance prediction market data
"""
from fastapi import APIRouter, HTTPException
from services.polymarket_finance_service import PolymarketFinanceService

router = APIRouter()
polymarket_service = PolymarketFinanceService()

VALID_CATEGORIES = {"stocks", "earnings", "indices", "fed-rates"}


@router.get("/finance")
async def get_all_finance_markets():
    """Fetch all 4 finance categories from Polymarket Gamma API"""
    try:
        data = await polymarket_service.get_all_categories()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/finance/{category}")
async def get_finance_category(category: str):
    """Fetch a single finance category (stocks/earnings/indices/fed-rates)"""
    if category not in VALID_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid category '{category}'. Must be one of: {', '.join(sorted(VALID_CATEGORIES))}",
        )
    try:
        data = await polymarket_service.fetch_category(category)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


