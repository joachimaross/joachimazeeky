"""zeeky.assistant
Core conversation logic for Zeeky. Currently uses the OpenAI ChatCompletion
API but can be extended to support multiple providers and local models.
"""
from __future__ import annotations

import logging
import os
from typing import List, Dict

import openai

# Anthropic SDK is optional; imported at runtime if needed to avoid heavy dependency
try:
    import anthropic
except ModuleNotFoundError:  # pragma: no cover
    anthropic = None  # type: ignore

logger = logging.getLogger(__name__)


class ZeekyAssistant:
    """A minimal conversational wrapper around an LLM."""

    def __init__(self, model: str = "gpt-4o-mini", system_prompt: str | None = None) -> None:
        self.model = model
        self.messages: List[Dict[str, str]] = [
            {
                "role": "system",
                "content": system_prompt
                or "You are Zeeky, an all-in-one ultimate AI assistant. Be helpful, concise, and friendly.",
            }
        ]

    # ---------------------------------------------------------------------
    # Public Methods
    # ---------------------------------------------------------------------
    def chat(self, user_input: str) -> str:
        """Append user input, query the model, and return the assistant reply."""
        self.messages.append({"role": "user", "content": user_input})

        logger.debug("Sending %d messages to model %s", len(self.messages), self.model)

        if self.model.startswith("claude") or self.model.startswith("anthropic"):
            if anthropic is None:
                raise RuntimeError(
                    "anthropic package not installed. Add 'anthropic' to requirements.txt."
                )

            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                raise RuntimeError("ANTHROPIC_API_KEY environment variable not set.")

            client = anthropic.Anthropic(api_key=api_key)

            response = client.messages.create(
                model=self.model,
                messages=[
                    {"role": msg["role"], "content": msg["content"]} for msg in self.messages
                ],
                max_tokens=1024,
            )

            # Claude 3 returns list of content blocks
            assistant_message: str = "".join(block.text for block in response.content)
        else:
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=self.messages,
            )

            assistant_message = response.choices[0].message["content"].strip()

        self.messages.append({"role": "assistant", "content": assistant_message})
        return assistant_message