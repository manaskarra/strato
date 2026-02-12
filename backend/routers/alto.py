"""
Alto AI Router - Handles AI analysis and chat requests
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Optional, List, Dict
from services.alto_service import AltoService
from alto.chat_service import AltoChatService
from config import settings

router = APIRouter()
alto_service = AltoService()

# Initialize chat service
chat_service = AltoChatService(
    eodhd_api_key=settings.eodhd_api_key,
    llm_base_url=settings.alto_api_base_url,
    llm_api_key=settings.alto_api_key,
    llm_model=settings.alto_model,
)


class AnalysisRequest(BaseModel):
    symbol: str
    exchange: str = "US"
    inputs: list[Any] = []
    user_context: Optional[str] = None


class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    detect_context: bool = True


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


@router.post("/chat")
async def chat_with_alto(request: ChatRequest):
    """
    Chat with Alto AI assistant
    """
    try:
        result = await chat_service.chat(
            messages=request.messages,
            detect_context=request.detect_context,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
