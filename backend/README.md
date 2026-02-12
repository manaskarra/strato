# Strato Backend (Python/FastAPI)

Complete backend rewrite in Python with FastAPI for better performance and maintainability.

## Architecture

```
backend/
├── main.py              # FastAPI application entry point
├── config.py            # Configuration and settings
├── requirements.txt     # Python dependencies
├── .env                 # Environment variables
├── routers/            # API route handlers
│   ├── eodhd.py        # EODHD market data endpoints
│   └── alto.py         # Alto AI endpoints
├── services/           # Business logic
│   ├── eodhd_service.py  # EODHD API integration
│   └── alto_service.py   # Alto AI service
└── alto/               # Alto AI system
    ├── persona.py      # Alto's personality (EDITABLE)
    └── security.py     # Security measures

## Setup

### 1. Create Virtual Environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment
Edit `.env` file with your API keys (already configured)

### 4. Run Server
```bash
python main.py
```

Or with uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Server will start at: **http://localhost:8000**

## API Endpoints

### EODHD Endpoints
- `GET /api/eodhd/technical` - Technical indicators (RSI, MACD, SMA)
- `GET /api/eodhd/fundamental` - Fundamental metrics
- `GET /api/eodhd/news` - News articles
- `GET /api/eodhd/chart` - Chart data (OHLCV)

### Alto AI Endpoints
- `POST /api/alto/analyze` - AI-powered analysis

### Health Check
- `GET /health` - Server health status
- `GET /` - API info

## API Documentation

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Security Features

### Input Sanitization
- Removes control characters
- Limits input length (10,000 chars)
- Escapes malicious patterns

### Prompt Injection Prevention
- Filters suspicious patterns
- Validates AI responses
- Sanitizes HTML/XSS
- Removes sensitive data

### Rate Limiting
- 10 requests/minute
- 100 requests/hour
- 4000 tokens/request max

## Customizing Alto

Edit `/alto/persona.py` to change:
- Tone and style
- Response format
- Guidelines
- Personality traits

Changes apply immediately (no restart needed with --reload)

## Development

### Testing Endpoints
```bash
# Health check
curl http://localhost:8000/health

# Technical analysis
curl "http://localhost:8000/api/eodhd/technical?symbol=AAPL&exchange=US"

# Alto analysis
curl -X POST http://localhost:8000/api/alto/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "exchange": "US",
    "inputs": [{"peRatio": 30, "marketCap": 3000000000000}]
  }'
```

### Hot Reload
The server auto-reloads when you edit Python files (when using `--reload` flag)

## Production Deployment

### Using Gunicorn
```bash
pip install gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Using Docker
```bash
# Build
docker build -t strato-backend .

# Run
docker run -p 8000:8000 --env-file .env strato-backend
```

## Environment Variables

Required:
- `EODHD_API_KEY` - EODHD API key
- `ALTO_API_BASE_URL` - LiteLLM API endpoint
- `ALTO_API_KEY` - LiteLLM API key
- `ALTO_MODEL` - Model name (gpt-4.1-mini, gpt-5-mini, sonar-pro)

Optional:
- `HOST` - Server host (default: 0.0.0.0)
- `PORT` - Server port (default: 8000)

## Troubleshooting

### ModuleNotFoundError
```bash
# Make sure you're in the venv
source venv/bin/activate
pip install -r requirements.txt
```

### Port Already in Use
```bash
# Change port in .env or use different port
uvicorn main:app --port 8001
```

### CORS Issues
- Frontend origins are configured in `config.py`
- Add your frontend URL if different from localhost:4782

## Stack

- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **httpx** - Async HTTP client
- **Pydantic** - Data validation
- **OpenAI** - LiteLLM API client

## Performance

- Async/await for concurrent requests
- Parallel API calls where possible
- Efficient data serialization
- Connection pooling via httpx

---

**Backend is ready!** Start it with `python main.py`
