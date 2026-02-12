"""
Alto Chat Service - Handles conversational AI interactions
"""
import httpx
from datetime import datetime
from typing import List, Dict, Any, Optional
from alto.persona import get_alto_system_prompt
from alto.context import AltoContext
from alto.security import sanitize_input, validate_ai_response


class AltoChatService:
    def __init__(self, eodhd_api_key: str, llm_base_url: str, llm_api_key: str, llm_model: str):
        self.context_detector = AltoContext(eodhd_api_key)
        self.llm_base_url = llm_base_url
        self.llm_api_key = llm_api_key
        self.llm_model = llm_model

    async def chat(
        self,
        messages: List[Dict[str, str]],
        detect_context: bool = True
    ) -> Dict[str, Any]:
        """
        Handle chat interaction with Alto

        Args:
            messages: List of message dicts with 'role' and 'content'
            detect_context: Whether to detect and fetch financial context

        Returns:
            Dict with response, context_used, and metadata
        """
        try:
            # Get the last user message for context detection
            last_user_message = None
            for msg in reversed(messages):
                if msg.get("role") == "user":
                    last_user_message = msg.get("content", "")
                    break

            # Detect and fetch context if enabled
            context_info = None
            context_formatted = ""
            if detect_context and last_user_message:
                context_info = await self.context_detector.detect_and_fetch_context(
                    last_user_message
                )
                context_formatted = context_info.get("formatted", "")

            # Build messages for LLM
            system_prompt = get_alto_system_prompt()
            llm_messages = [
                {"role": "system", "content": system_prompt}
            ]

            # Add context as a system message if available
            if context_formatted:
                # Add current date to context
                current_date = datetime.now().strftime("%B %d, %Y")

                llm_messages.append({
                    "role": "system",
                    "content": f"# Financial Data Context\n\n**CURRENT DATE: {current_date}**\n\n{context_formatted}"
                })

            # Add conversation messages (sanitized)
            for msg in messages:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "user":
                    content = sanitize_input(content)
                llm_messages.append({
                    "role": role,
                    "content": content
                })

            # Call LLM
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.llm_base_url}/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {self.llm_api_key}",
                    },
                    json={
                        "model": self.llm_model,
                        "messages": llm_messages,
                        "temperature": 0.7,
                        "max_tokens": 1500,
                    },
                )

                if response.status_code != 200:
                    error_text = response.text
                    raise Exception(f"LLM API error: {response.status_code} {error_text}")

                data = response.json()

                # Extract response
                assistant_message = data.get("choices", [{}])[0].get("message", {}).get("content", "")

                # Validate response
                validation = validate_ai_response(assistant_message)
                if not validation["valid"]:
                    raise Exception(f"Invalid AI response: {validation['error']}")

                return {
                    "message": {
                        "role": "assistant",
                        "content": validation["sanitized"],
                    },
                    "context_used": context_info.get("sources", []) if context_info else [],
                    "context_type": context_info.get("type") if context_info else None,
                    "model": self.llm_model,
                    "timestamp": datetime.now().isoformat(),
                    "tokens_used": data.get("usage", {}).get("total_tokens"),
                }

        except Exception as e:
            raise Exception(f"Chat failed: {str(e)}")
