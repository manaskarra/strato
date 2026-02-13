"""
EODHD API Router - Handles all market data endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from services.eodhd_service import EODHDService

router = APIRouter()
eodhd_service = EODHDService()


@router.get("/technical")
async def get_technical_analysis(
    symbol: str = Query(..., description="Stock symbol"),
    exchange: str = Query("US", description="Exchange code"),
):
    """
    Fetch technical analysis indicators (RSI, MACD, SMA, Bollinger Bands, EMA, ATR, Stochastic)
    """
    try:
        data = await eodhd_service.fetch_technical_analysis(symbol, exchange)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fundamental")
async def get_fundamental_analysis(
    symbol: str = Query(..., description="Stock symbol"),
    exchange: str = Query("US", description="Exchange code"),
):
    """
    Fetch fundamental analysis data (P/E, margins, revenue)
    """
    try:
        data = await eodhd_service.fetch_fundamental_analysis(symbol, exchange)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/news")
async def get_news(
    symbol: str = Query(..., description="Stock symbol"),
    exchange: str = Query("US", description="Exchange code"),
    limit: int = Query(20, ge=1, le=100, description="Number of articles"),
):
    """
    Fetch news articles for a symbol
    """
    try:
        data = await eodhd_service.fetch_news(symbol, exchange, limit)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chart")
async def get_chart_data(
    symbol: str = Query(..., description="Stock symbol"),
    exchange: str = Query("US", description="Exchange code"),
    period: str = Query("month", description="Time period: month, quarter, year, intraday"),
    interval: str = Query("5m", description="Interval for intraday: 1m, 5m, 1h"),
):
    """
    Fetch chart data (OHLCV)
    """
    try:
        if period == "intraday":
            data = await eodhd_service.fetch_chart_data(symbol, exchange, interval)
        else:
            data = await eodhd_service.fetch_historical_data(symbol, exchange, period)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sentiment")
async def get_sentiment(
    symbol: str = Query(..., description="Stock symbol"),
    exchange: str = Query("US", description="Exchange code"),
):
    """
    Fetch sentiment analysis data
    """
    try:
        data = await eodhd_service.fetch_sentiment(symbol, exchange)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
