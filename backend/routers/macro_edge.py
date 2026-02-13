"""
Macro Edge Router - Serves macro edge scores
"""
from fastapi import APIRouter, HTTPException
from services.macro_edge_service import MacroEdgeService

router = APIRouter()
macro_edge_service = MacroEdgeService()


@router.get("/scores")
async def get_macro_edge_scores():
    """
    Fetch macro edge scores (inflation, fed rate cut, recession)
    with Alto AI narrative analysis
    """
    try:
        data = await macro_edge_service.get_macro_edge_scores()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
