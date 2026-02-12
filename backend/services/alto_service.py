"""
Alto AI Service - Handles AI analysis
"""
import httpx
from datetime import datetime
from config import settings
from alto.persona import get_alto_system_prompt
from alto.security import (
    sanitize_input,
    sanitize_data_context,
    validate_ai_response,
    create_secure_context,
)


class AltoService:
    def __init__(self):
        self.base_url = settings.alto_api_base_url
        self.api_key = settings.alto_api_key
        self.model = settings.alto_model

    def _format_analysis_data(self, inputs: list[dict]) -> str:
        """Format analysis data for display"""
        sections = []

        for input_data in inputs:
            if not input_data:
                continue

            # Technical Analysis
            if "rsi" in input_data or "macd" in input_data or "sma" in input_data:
                sections.append("Technical Indicators:")
                if input_data.get("rsi") and len(input_data["rsi"]) > 0:
                    latest = input_data["rsi"][0]
                    rsi_val = latest.get("rsi", "N/A")
                    sections.append(f"- RSI: {rsi_val if rsi_val != 'N/A' else 'N/A'}")
                if input_data.get("macd") and len(input_data["macd"]) > 0:
                    latest = input_data["macd"][0]
                    macd_val = latest.get("macd", "N/A")
                    sections.append(f"- MACD: {macd_val if macd_val != 'N/A' else 'N/A'}")
                if input_data.get("sma") and len(input_data["sma"]) > 0:
                    latest = input_data["sma"][0]
                    sma_val = latest.get("sma", "N/A")
                    sections.append(f"- SMA(50): ${sma_val if sma_val != 'N/A' else 'N/A'}")

            # Fundamental Analysis
            if "peRatio" in input_data or "marketCap" in input_data:
                sections.append("\nFundamental Metrics:")
                if "peRatio" in input_data:
                    sections.append(f"- P/E Ratio: {input_data['peRatio']:.2f}")
                if "marketCap" in input_data:
                    sections.append(f"- Market Cap: ${input_data['marketCap'] / 1e9:.2f}B")
                if "profitMargin" in input_data:
                    sections.append(f"- Profit Margin: {input_data['profitMargin'] * 100:.2f}%")
                if "roe" in input_data:
                    sections.append(f"- ROE: {input_data['roe'] * 100:.2f}%")

            # News
            if isinstance(input_data, list) and len(input_data) > 0:
                first_item = input_data[0]
                if isinstance(first_item, dict) and "title" in first_item:
                    sections.append("\nRecent News:")
                    for i, article in enumerate(input_data[:3], 1):
                        sections.append(f"{i}. {article['title']}")

            # Chart Data
            if isinstance(input_data, list) and len(input_data) > 0:
                first_item = input_data[0]
                if isinstance(first_item, dict) and "close" in first_item:
                    latest = input_data[-1]
                    first = input_data[0]
                    change = ((latest["close"] - first["close"]) / first["close"]) * 100
                    sections.append("\nPrice Data:")
                    sections.append(f"- Current: ${latest['close']:.2f}")
                    sections.append(f"- Change: {'+' if change >= 0 else ''}{change:.2f}%")

        return "\n".join(sections)

    async def analyze(
        self,
        symbol: str,
        exchange: str,
        inputs: list[dict],
        user_context: str | None = None,
    ) -> dict:
        """Analyze financial data using Alto AI"""

        # Create secure context
        secure_context = create_secure_context({
            "symbol": symbol,
            "exchange": exchange,
            "inputs": inputs,
            "timestamp": datetime.now().isoformat(),
        })

        # Sanitize user context if provided
        user_ctx = sanitize_input(user_context) if user_context else ""

        # Build the prompt
        system_prompt = get_alto_system_prompt()

        user_prompt = f"""Analyze the following financial data for {symbol}.{exchange}:

{secure_context}

{f"Additional context: {user_ctx}" if user_ctx else ""}

Provide a comprehensive analysis based on the available data. Include insights on:
- Key trends and patterns
- Risk factors
- Notable findings
- Actionable recommendations

Be specific and reference the data in your analysis."""

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.api_key}",
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.7,
                        "max_tokens": 2000,
                    },
                )

                if response.status_code != 200:
                    error_text = response.text
                    raise Exception(f"API request failed: {response.status_code} {error_text}")

                data = response.json()

                # Extract the analysis
                analysis_text = data.get("choices", [{}])[0].get("message", {}).get("content", "")

                # Validate the response
                validation = validate_ai_response(analysis_text)
                if not validation["valid"]:
                    raise Exception(f"Invalid AI response: {validation['error']}")

                return {
                    "analysis": validation["sanitized"],
                    "model": self.model,
                    "timestamp": datetime.now().isoformat(),
                    "tokensUsed": data.get("usage", {}).get("total_tokens"),
                }

        except Exception as e:
            raise Exception(f"Analysis failed: {str(e)}")
