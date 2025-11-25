# Local AI package initialization
# backend/triage_service/local_ai/__init__.py
from .agent import analyze_incident

class _AgentWrapper:
    async def analyze_incident(self, *args, **kwargs):
        return await analyze_incident(*args, **kwargs)

# module-level triage_agent for backward compatibility with routes
triage_agent = _AgentWrapper()
