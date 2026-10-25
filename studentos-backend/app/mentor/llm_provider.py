"""
StudentOS Groq LLM provider.

Responsibilities:
- Read Groq configuration from environment variables / .env.
- Keep API credentials out of source code.
- Provide a small, predictable interface for mentor workflow nodes.
- Return plain text by default, or request JSON output when needed.

Install dependencies in the backend virtual environment:
    pip install groq python-dotenv

Expected .env entries:
    GROQ_API_KEY=your_groq_api_key
    GROQ_MODEL=llama-3.3-70b-versatile

Never commit .env or expose your API key in logs.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from dotenv import load_dotenv
from groq import APIConnectionError, APIStatusError, Groq, RateLimitError

logger = logging.getLogger(__name__)

# Load .env from the current working directory (normally studentos-backend).
# Existing environment variables take precedence over values in .env.
load_dotenv()

DEFAULT_MODEL = "llama-3.3-70b-versatile"


class LLMProviderError(RuntimeError):
    """Raised when the LLM provider cannot return a usable response."""


class GroqLLMProvider:
    """Small wrapper around the Groq chat-completions API."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        timeout_seconds: float = 45.0,
    ) -> None:
        resolved_api_key = api_key or os.getenv("GROQ_API_KEY")
        resolved_model = model or os.getenv("GROQ_MODEL") or DEFAULT_MODEL

        if not resolved_api_key:
            raise LLMProviderError(
                "GROQ_API_KEY is missing. Add it to your backend .env file "
                "or set it as an environment variable."
            )

        self.model = resolved_model
        try:
            self.client = Groq(
                api_key=resolved_api_key,
                timeout=timeout_seconds,
            )
        except Exception as exc:
            logger.exception("Could not initialize Groq client")
            raise LLMProviderError("Could not initialize the Groq client.") from exc

    def generate(
        self,
        system_prompt: str,
        user_message: str,
        *,
        temperature: float = 0.3,
        max_tokens: int = 1200,
    ) -> str:
        """Generate a plain-text response."""
        if not system_prompt or not system_prompt.strip():
            raise ValueError("system_prompt cannot be empty")
        if not user_message or not user_message.strip():
            raise ValueError("user_message cannot be empty")

        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt.strip()},
                    {"role": "user", "content": user_message.strip()},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            content = completion.choices[0].message.content
            if not content or not content.strip():
                raise LLMProviderError("Groq returned an empty response.")
            return content.strip()

        except (RateLimitError, APIConnectionError, APIStatusError) as exc:
            logger.warning("Groq API request failed: %s", type(exc).__name__)
            raise LLMProviderError(
                "The AI service request failed. Check API access, rate limits, "
                "network connectivity, and the configured model."
            ) from exc
        except LLMProviderError:
            raise
        except Exception as exc:
            logger.exception("Unexpected error during Groq generation")
            raise LLMProviderError("Unexpected error while generating an AI response.") from exc

    def generate_json(
        self,
        system_prompt: str,
        user_message: str,
        *,
        temperature: float = 0.2,
        max_tokens: int = 1600,
    ) -> dict[str, Any]:
        """
        Generate and parse a JSON object.

        JSON mode is requested from Groq. Parsing is still checked locally,
        because model output must never be trusted without validation.
        """
        if not system_prompt or not system_prompt.strip():
            raise ValueError("system_prompt cannot be empty")
        if not user_message or not user_message.strip():
            raise ValueError("user_message cannot be empty")

        try:
            completion = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            system_prompt.strip()
                            + "\nReturn only one valid JSON object. "
                            "Do not wrap it in Markdown fences."
                        ),
                    },
                    {"role": "user", "content": user_message.strip()},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            content = completion.choices[0].message.content
            if not content or not content.strip():
                raise LLMProviderError("Groq returned an empty JSON response.")

            parsed = json.loads(content)
            if not isinstance(parsed, dict):
                raise LLMProviderError("The model response must be a JSON object.")
            return parsed

        except json.JSONDecodeError as exc:
            logger.warning("Groq returned invalid JSON")
            raise LLMProviderError("The AI service returned invalid JSON.") from exc
        except (RateLimitError, APIConnectionError, APIStatusError) as exc:
            logger.warning("Groq API request failed: %s", type(exc).__name__)
            raise LLMProviderError(
                "The AI service request failed. Check API access, rate limits, "
                "network connectivity, and the configured model."
            ) from exc
        except LLMProviderError:
            raise
        except Exception as exc:
            logger.exception("Unexpected error during JSON generation")
            raise LLMProviderError("Unexpected error while generating JSON.") from exc


# Convenient module-level functions for workflow nodes.
# A provider is created on demand so importing this module does not require
# GROQ_API_KEY to be present until an LLM request is actually made.

def generate_response(
    system_prompt: str,
    user_message: str,
    *,
    temperature: float = 0.3,
    max_tokens: int = 1200,
) -> str:
    """Generate a plain-text response using the configured Groq model."""
    provider = GroqLLMProvider()
    return provider.generate(
        system_prompt,
        user_message,
        temperature=temperature,
        max_tokens=max_tokens,
    )


def generate_json_response(
    system_prompt: str,
    user_message: str,
    *,
    temperature: float = 0.2,
    max_tokens: int = 1600,
) -> dict[str, Any]:
    """Generate a JSON-object response using the configured Groq model."""
    provider = GroqLLMProvider()
    return provider.generate_json(
        system_prompt,
        user_message,
        temperature=temperature,
        max_tokens=max_tokens,
    )


if __name__ == "__main__":
    # Safe connectivity smoke test. It prints the model response but never
    # prints the API key. Run only after setting GROQ_API_KEY in .env.
    try:
        answer = generate_response(
            "You are StudentOS, a friendly student mentor. Be concise.",
            "Reply with one short sentence confirming you are ready to help.",
            max_tokens=100,
        )
        print(f"Groq provider test successful ({os.getenv('GROQ_MODEL', DEFAULT_MODEL)}):")
        print(answer)
    except LLMProviderError as exc:
        print(f"Groq provider test failed: {exc}")
        raise SystemExit(1)
