import json
from app.core.base_agent import BaseAgent
from app.schemas.suburb import SuburbSearchInput, SuburbSearchResult


class SuburbSearchAgent(BaseAgent):
    name = "suburb_search_agent"

    async def run(self, query: SuburbSearchInput) -> tuple[SuburbSearchResult, int]:  # type: ignore[override]
        user_message = json.dumps(query.model_dump())
        text, tokens = await self._call_claude(user_message)
        data = self._extract_json(text)
        return SuburbSearchResult(**data), tokens
