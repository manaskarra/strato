"""
Alto AI Security Module

Implements security measures to prevent:
- Prompt injection attacks
- Data exfiltration
- Malicious inputs
- Unauthorized access
"""
import re
import json
from typing import Any


def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent prompt injection"""
    if not text or not isinstance(text, str):
        return ""

    # Remove control characters
    sanitized = re.sub(r'[\x00-\x1F\x7F]', '', text)

    # Limit consecutive newlines
    sanitized = re.sub(r'\n{3,}', '\n\n', sanitized)

    # Remove excessive whitespace
    sanitized = re.sub(r'\s{3,}', ' ', sanitized)

    # Trim
    sanitized = sanitized.strip()

    # Enforce max length
    MAX_LENGTH = 10000
    if len(sanitized) > MAX_LENGTH:
        sanitized = sanitized[:MAX_LENGTH]

    return sanitized


def sanitize_data_context(data: Any) -> Any:
    """Validate and sanitize data context for AI analysis"""
    if not data or not isinstance(data, (dict, list)):
        return {}

    # Deep clone to avoid mutations
    sanitized = json.loads(json.dumps(data))

    # Remove sensitive keys
    sensitive_keys = ['api_key', 'token', 'password', 'secret', 'credential']

    def remove_sensitive(obj: Any) -> Any:
        if isinstance(obj, list):
            return [remove_sensitive(item) for item in obj]

        if isinstance(obj, dict):
            cleaned = {}
            for key, value in obj.items():
                lower_key = key.lower()
                if not any(sk in lower_key for sk in sensitive_keys):
                    cleaned[key] = remove_sensitive(value)
            return cleaned

        return obj

    return remove_sensitive(sanitized)


def validate_ai_response(response: str) -> dict:
    """Validate API response to ensure it's safe"""
    if not response or not isinstance(response, str):
        return {
            "valid": False,
            "sanitized": "",
            "error": "Invalid response format",
        }

    # Check for suspicious patterns
    suspicious_patterns = [
        r'system\s*:',
        r'ignore\s+previous\s+instructions',
        r'disregard\s+all\s+prior',
        r'<script[^>]*>',
        r'javascript:',
        r'on\w+\s*=',  # event handlers
    ]

    for pattern in suspicious_patterns:
        if re.search(pattern, response, re.IGNORECASE):
            return {
                "valid": False,
                "sanitized": "",
                "error": "Response contains suspicious patterns",
            }

    # Sanitize HTML/XSS
    sanitized = re.sub(r'<script[^>]*>.*?</script>', '', response, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r'<iframe[^>]*>.*?</iframe>', '', sanitized, flags=re.IGNORECASE | re.DOTALL)
    sanitized = re.sub(r'javascript:', '', sanitized, flags=re.IGNORECASE)

    return {
        "valid": True,
        "sanitized": sanitized,
    }


def create_secure_context(data: dict) -> str:
    """Create a secure context for AI analysis"""
    # Sanitize all inputs
    sanitized_symbol = sanitize_input(data.get("symbol", ""))
    sanitized_exchange = sanitize_input(data.get("exchange", ""))
    sanitized_inputs = [sanitize_data_context(inp) for inp in data.get("inputs", [])]

    # Build structured, sanitized context
    context = {
        "symbol": sanitized_symbol.upper(),
        "exchange": sanitized_exchange.upper(),
        "analysisData": sanitized_inputs,
        "timestamp": data.get("timestamp", ""),
    }

    return json.dumps(context, indent=2)


RATE_LIMITS = {
    "max_requests_per_minute": 10,
    "max_requests_per_hour": 100,
    "max_tokens_per_request": 4000,
}
