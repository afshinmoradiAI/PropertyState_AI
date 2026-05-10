from __future__ import annotations
import json
import logging
import re
from abc import ABC, abstractmethod
from pathlib import Path

import anthropic
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: anthropic.AsyncAnthropic | None = None


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


class BaseAgent(ABC):
    name: str

    def load_prompt(self) -> str:
        prompt_path = Path(__file__).parent.parent / "prompts" / f"{self.name}.md"
        return prompt_path.read_text(encoding="utf-8")

    def _extract_json(self, text: str) -> dict:
        """Extract the first JSON object from model output."""
        match = re.search(r"```json\s*([\s\S]*?)\s*```", text)
        if match:
            return json.loads(match.group(1))
        match = re.search(r"\{[\s\S]*\}", text)
        if match:
            return json.loads(match.group(0))
        raise ValueError(f"No JSON found in agent '{self.name}' response")

    async def _call_claude(self, user_message: str) -> tuple[str, int]:
        client = get_client()
        logger.info("Agent '%s' → calling Claude", self.name)
        response = await client.messages.create(
            model=settings.default_model,
            max_tokens=settings.max_tokens,
            system=self.load_prompt(),
            messages=[{"role": "user", "content": user_message}],
        )
        tokens = response.usage.input_tokens + response.usage.output_tokens
        text = response.content[0].text
        logger.info("Agent '%s' ← %d tokens used", self.name, tokens)
        return text, tokens

    @abstractmethod
    async def run(self, prop: BaseModel) -> tuple[BaseModel, int]:
        """Return (result_model, tokens_used)."""
