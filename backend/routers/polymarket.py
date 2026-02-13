"""
Polymarket Router - Serves live finance prediction market data
"""
import re
from fastapi import APIRouter, HTTPException
from services.polymarket_finance_service import PolymarketFinanceService
from services.earnings_prediction_service import EarningsPredictionService

router = APIRouter()
polymarket_service = PolymarketFinanceService()
earnings_service = EarningsPredictionService()

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


@router.get("/earnings-with-edge")
async def get_earnings_with_edge():
    """
    Fetch earnings markets from Polymarket and add Alto's predictions + edge analysis
    Returns markets with: Polymarket odds, Alto prediction, edge calculation
    """
    import httpx

    try:
        # Fetch earnings markets from Polymarket
        earnings_events = await polymarket_service.fetch_category("earnings")

        if not earnings_events:
            return {
                "events": [],
                "count": 0,
                "message": "No earnings markets found"
            }

        # Extract tickers and get predictions using a shared client
        enriched_events = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            for event in earnings_events[:20]:  # Limit to top 20 by volume
                # Try to extract ticker from title (e.g., "DoorDash (DASH)" -> "DASH")
                title = event.get("title", "")
                ticker_match = re.search(r'\(([A-Z]{1,5})\)', title)

                if not ticker_match:
                    # Skip if no ticker found
                    enriched_events.append({
                        **event,
                        "ticker": None,
                        "alto_prediction": None,
                        "edge_analysis": None
                    })
                    continue

                ticker = ticker_match.group(1)

                # Get Alto's prediction for this ticker
                try:
                    prediction = await earnings_service.calculate_beat_probability(
                        client,
                        ticker,
                        {"company": title, "ticker": ticker}
                    )
                except Exception:
                    prediction = None

                # Calculate edge if we have both Polymarket odds and Alto prediction
                edge_analysis = None
                if prediction and event.get("markets") and len(event["markets"]) > 0:
                    # Get "Yes" probability from first market (usually "Will beat earnings?")
                    first_market = event["markets"][0]
                    if first_market.get("prices") and len(first_market["prices"]) > 0:
                        polymarket_yes_prob = first_market["prices"][0] * 100  # Convert to percentage
                        alto_prob = prediction["beat_probability"]

                        edge_analysis = earnings_service.calculate_edge(alto_prob, polymarket_yes_prob)

                enriched_events.append({
                    **event,
                    "ticker": ticker,
                    "alto_prediction": prediction,
                    "edge_analysis": edge_analysis
                })

        return {
            "events": enriched_events,
            "count": len(enriched_events),
            "with_predictions": sum(1 for e in enriched_events if e.get("alto_prediction")),
            "significant_edges": sum(1 for e in enriched_events if e.get("edge_analysis", {}).get("category") == "SIGNIFICANT EDGE")
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
