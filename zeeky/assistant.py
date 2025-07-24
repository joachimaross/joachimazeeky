"""zeeky.assistant
Core conversation logic for Zeeky. Currently uses the OpenAI ChatCompletion
API but can be extended to support multiple providers and local models.
"""
from __future__ import annotations

import logging
from typing import List, Dict

import openai

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

        response = openai.ChatCompletion.create(
            model=self.model,
            messages=self.messages,
        )

        assistant_message: str = response.choices[0].message["content"].strip()
        self.messages.append({"role": "assistant", "content": assistant_message})
        return assistant_message