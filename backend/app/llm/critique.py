"""critique_appeal — self-review of a drafted appeal, structured output (TRD §6).

A reviewer pass that scores the drafted letter against the denial reason and the
retrieved policy guidance and, when the draft is weak, returns an improved
rewrite. Provider-agnostic via ``with_structured_output``.
"""

from typing import Optional

from ..schemas import AppealCritique
from .prompts import CRITIQUE_APPEAL


def critique_appeal(
    llm,
    *,
    letter: str,
    reason_summary: str,
    appeal_angle: Optional[str],
    policy_context: str,
) -> AppealCritique:
    from langchain_core.messages import HumanMessage, SystemMessage

    user = (
        f"Denial reason: {reason_summary}\n"
        f"Intended appeal argument: {appeal_angle or 'n/a'}\n\n"
        f"Relevant policy guidance:\n{policy_context or 'none'}\n\n"
        f'Drafted appeal letter:\n"""\n{letter}\n"""'
    )
    structured = llm.with_structured_output(AppealCritique)
    return structured.invoke(
        [SystemMessage(content=CRITIQUE_APPEAL), HumanMessage(content=user)]
    )
