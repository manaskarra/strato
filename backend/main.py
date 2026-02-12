"""
Strato Backend API - FastAPI Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from routers import eodhd, alto

app = FastAPI(
    title="Strato Backend API",
    description="Backend API for Strato financial analysis platform",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(eodhd.router, prefix="/api/eodhd", tags=["EODHD"])
app.include_router(alto.router, prefix="/api/alto", tags=["Alto"])


@app.get("/")
async def root():
    return {
        "message": "Strato Backend API",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
    )
