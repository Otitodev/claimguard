"""Compiles the LangGraph pipeline and exposes run_pipeline (TRD §6).

The graph is built per request so its nodes can close over the request-scoped
SQLAlchemy session. ``run_pipeline`` is the single entrypoint shared by the
manual-upload endpoint and the AgentMail webhook.
"""

import uuid
from typing import Optional

from langgraph.graph import END, START, StateGraph

from ..config import settings
from ..llm.provider import get_chat_model
from .nodes import (
    make_classify,
    make_critique,
    make_draft,
    make_match_claim,
    make_parse_eob,
    make_persist,
    make_resolve,
    make_retrieve_policy,
    route_after_classify,
)
from .state import PipelineState


def build_graph(session, llm, critique_llm=None):
    # The self-critique runs on a faster model when one is provided; the rest of
    # the pipeline (extract/classify/draft) stays on the flagship model.
    critique_llm = critique_llm or llm
    g = StateGraph(PipelineState)
    g.add_node("parse_eob", make_parse_eob(session, llm))
    g.add_node("resolve_patient_and_payer", make_resolve(session, llm))
    g.add_node("match_or_create_claim", make_match_claim(session, llm))
    g.add_node("retrieve_policy", make_retrieve_policy(session, llm))
    g.add_node("classify_denial", make_classify(session, llm))
    g.add_node("draft_appeal", make_draft(session, llm))
    g.add_node("critique_appeal", make_critique(session, critique_llm))
    g.add_node("persist", make_persist(session, llm))

    g.add_edge(START, "parse_eob")
    g.add_edge("parse_eob", "resolve_patient_and_payer")
    g.add_edge("resolve_patient_and_payer", "match_or_create_claim")
    g.add_edge("match_or_create_claim", "retrieve_policy")
    g.add_edge("retrieve_policy", "classify_denial")
    g.add_conditional_edges(
        "classify_denial",
        route_after_classify,
        {"draft_appeal": "draft_appeal", "persist": "persist"},
    )
    # appeal path runs the self-critique/revise pass before persisting
    g.add_edge("draft_appeal", "critique_appeal")
    g.add_edge("critique_appeal", "persist")
    g.add_edge("persist", END)
    return g.compile()


def run_pipeline(
    session,
    *,
    practice_id: uuid.UUID,
    pdf_bytes: bytes,
    llm=None,
    critique_llm=None,
    source_document_url: Optional[str] = None,
    source: str = "upload",
) -> dict:
    """Run parse → resolve → retrieve_policy → classify → (draft → critique) →
    persist, then commit.

    The critique pass uses ``LLM_FAST_MODEL`` (Haiku) so the extra reviewer call
    barely adds latency. When ``llm`` is injected (tests), it's reused for the
    critique too. Returns the result dict; the caller re-queries the claim for
    the full detail response.
    """
    if llm is None:
        llm = get_chat_model()
        if critique_llm is None:
            critique_llm = get_chat_model(settings.llm_fast_model)
    graph = build_graph(session, llm, critique_llm)
    initial: PipelineState = {
        "practice_id": practice_id,
        "pdf_bytes": pdf_bytes,
        "source_document_url": source_document_url,
        "source": source,
    }
    final = graph.invoke(initial)
    session.commit()
    return final["result"]
