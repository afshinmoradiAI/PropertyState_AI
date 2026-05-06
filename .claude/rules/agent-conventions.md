# Agent Conventions
 
Every agent MUST:
- Inherit from BaseAgent
- Load its system prompt from prompts/<name>.md via load_prompt()
- Accept and return Pydantic models — no raw dicts
- Be async (async def run)
- Log entry, exit, and token usage
- Have a corresponding test file in tests/test_agents/
- Be registered in the orchestrator's agent map
 
Every agent MUST NOT:
- Call another agent directly (use the orchestrator)
- Have business logic in the prompt file (logic belongs in Python)
- Use global state
- Catch exceptions silently — let them bubble up to the orchestrator
