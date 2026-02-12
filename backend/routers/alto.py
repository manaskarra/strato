"""
Alto AI Router - Handles AI analysis requests
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Optional
from services.alto_service import AltoService

router = APIRouter()
alto_service = AltoService()


class AnalysisRequest(BaseModel):
    symbol: str
    exchange: str = "US"
    inputs: list[Any] = []
    user_context: Optional[str] = None


@router.post("/analyze")
async def analyze_with_alto(request: AnalysisRequest):
    """
    Analyze financial data using Alto AI
    """
    try:
        result = await alto_service.analyze(
            symbol=request.symbol,
            exchange=request.exchange,
            inputs=request.inputs,
            user_context=request.user_context,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
