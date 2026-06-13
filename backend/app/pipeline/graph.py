"""Compiles the LangGraph pipeline and exposes run_pipeline (TRD §6).

The graph is built per request so its nodes can close over the request-scoped
SQLAlchemy session. ``run_pipeline`` is the single entrypoint shared by the
manual-upload endpoint and the AgentMail webhook.
"""

import uuid
from typing import Optional

from langgraph.graph import END, START, StateGraph

from ..llm.provider import get_chat_model
from .nodes import (
    make_classify,
    make_draft,
    make_match_claim,
    make_parse_eob,
    make_persist,
    make_resolve,
    route_after_classify,
)
from .state import PipelineState


def build_graph(session, llm):
    g = StateGraph(PipelineState)
    g.add_node("parse_eob", make_parse_eob(session, llm))
    g.add_node("resolve_patient_and_payer", make_resolve(session, llm))
    g.add_node("match_or_create_claim", make_match_claim(session, llm))
    g.add_node("classify_denial", make_classify(session, llm))
    g.add_node("draft_appeal", make_draft(session, llm))
    g.add_node("persist", make_persist(session, llm))

    g.add_edge(START, "parse_eob")
    g.add_edge("parse_eob", "resolve_patient_and_payer")
    g.add_edge("resolve_patient_and_payer", "match_or_create_claim")
    g.add_edge("match_or_create_claim", "classify_denial")
    g.add_conditional_edges(
        "classify_denial",
        route_after_classify,
        {"draft_appeal": "draft_appeal", "persist": "persist"},
    )
    g.add_edge("draft_appeal", "persist")
    g.add_edge("persist", END)
    return g.compile()


def run_pipeline(
    session,
    *,
    practice_id: uuid.UUID,
    pdf_bytes: bytes,
    llm=None,
    source_document_url: Optional[str] = None,
) -> dict:
    """Run parse → resolve → match → classify → (draft) → persist, then commit.

    Returns the result dict (claim_id, classification, flags). The caller
    re-queries the claim for the full detail response.
    """
    if llm is None:
        llm = get_chat_model()
    graph = build_graph(session, llm)
    initial: PipelineState = {
        "practice_id": practice_id,
        "pdf_bytes": pdf_bytes,
        "source_document_url": source_document_url,
    }
    final = graph.invoke(initial)
    session.commit()
    return final["result"]
