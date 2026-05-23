from __future__ import annotations
import json
import re
from abc import ABC, abstractmethod
from pathlib import Path

import anthropic
import structlog
from pydantic import BaseModel
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)

from app.core.config import settings

logger = structlog.get_logger(__name__)

_client: anthropic.AsyncAnthropic | None = None


def get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


# Transient errors that are safe to retry. APIStatusError covers 5xx / overload / 429.
_RETRYABLE = (
    anthropic.APIConnectionError,
    anthropic.APITimeoutError,
    anthropic.RateLimitError,
    anthropic.InternalServerError,
)


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

    @retry(
        retry=retry_if_exception_type(_RETRYABLE),
        stop=stop_after_attempt(3),
        wait=wait_exponential_jitter(initial=1, max=8),
        reraise=True,
    )
    async def _call_claude(self, user_message: str) -> tuple[str, int]:
        client = get_client()
        log = logger.bind(agent=self.name)
        log.info("agent.call.start")

        # Cache the long, static system prompt so repeated calls hit the prompt cache.
        # Anthropic charges 10% for cache_read tokens and 25% for cache_write tokens —
        # caching the system prompt saves ~90% on every subsequent agent call.
        system_blocks = [
            {
                "type": "text",
                "text": self.load_prompt(),
                "cache_control": {"type": "ephemeral"},
            }
        ]

        # Resolve which model to use — honours per-request override (X-Model header)
        from app.core.plan_gate import get_active_model
        model = get_active_model()

        response = await client.messages.create(
            model=model,
            max_tokens=settings.max_tokens,
            system=system_blocks,
            messages=[{"role": "user", "content": user_message}],
        )

        usage = response.usage
        input_tokens = usage.input_tokens
        output_tokens = usage.output_tokens
        cache_read = getattr(usage, "cache_read_input_tokens", 0) or 0
        cache_write = getattr(usage, "cache_creation_input_tokens", 0) or 0
        # Total billable tokens = input + output + cache_read + cache_write
        # (cache_read is billed at 10%, cache_write at 25%, but we count the raw count here)
        total = input_tokens + output_tokens + cache_read + cache_write
        text = response.content[0].text

        log.info(
            "agent.call.done",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cache_read_tokens=cache_read,
            cache_write_tokens=cache_write,
            total_tokens=total,
            cache_hit_ratio=round(cache_read / max(1, input_tokens + cache_read), 2),
        )
        return text, total

    @abstractmethod
    async def run(self, prop: BaseModel) -> tuple[BaseModel, int]:
        """Return (result_model, tokens_used)."""
