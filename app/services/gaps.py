"""Weekly Intelligence — capture, and the dashboard Gaps card's fix/dismiss flow.

Capture: records moments the assistant could not answer from the business's
knowledge (same detection instant as the unanswered-streak/handoff logic in
app/services/ai.py). Clustering into human-readable topics happens later,
in the nightly job (app/services/clustering.py).

Gaps card: list_open_clusters/resolve_cluster/dismiss_cluster back the
GET/resolve/dismiss endpoints in app/routers/gaps.py.
"""
from sqlalchemy.orm import Session

from app.models.knowledge_item import KnowledgeCategory, KnowledgeItem
from app.models.question_cluster import QuestionCluster
from app.models.unanswered_question import UnansweredQuestionStatus
from app.repositories.knowledge_item import KnowledgeItemRepository
from app.repositories.question_cluster import QuestionClusterRepository
from app.repositories.unanswered_question import UnansweredQuestionRepository

_CATEGORY_KEYWORDS: dict[KnowledgeCategory, tuple[str, ...]] = {
    KnowledgeCategory.hours: ("hour", "open", "close", "time"),
    KnowledgeCategory.location: ("location", "address", "where", "direction"),
    KnowledgeCategory.policy: ("policy", "refund", "cancel", "warranty", "guarantee"),
    KnowledgeCategory.faq: ("faq", "question"),
}


def guess_category(label_en: str) -> KnowledgeCategory:
    """A cheap keyword guess for the fix-flow form's pre-filled category —
    just a form default the owner can freely change, not worth an AI call.
    """
    lowered = label_en.lower()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(keyword in lowered for keyword in keywords):
            return category
    return KnowledgeCategory.service


def record_unanswered_question(
    db: Session, business_id: int, conversation_id: int, question_text: str
) -> None:
    UnansweredQuestionRepository(db, business_id).create(
        conversation_id=conversation_id, question_text=question_text
    )


def list_open_clusters(db: Session, business_id: int) -> list[QuestionCluster]:
    return QuestionClusterRepository(db, business_id).list_open_by_count()


def resolve_cluster(
    db: Session, business_id: int, cluster_id: int, knowledge_fields: dict
) -> tuple[KnowledgeItem, QuestionCluster] | None:
    """Creates the knowledge item and marks the cluster + its questions
    resolved, all scoped to business_id so a cluster_id from another tenant
    simply isn't found (returns None -> the router 404s).
    """
    cluster = QuestionClusterRepository(db, business_id).get(cluster_id)
    if cluster is None:
        return None

    knowledge_item = KnowledgeItemRepository(db, business_id).create(**knowledge_fields)
    cluster.status = UnansweredQuestionStatus.resolved
    UnansweredQuestionRepository(db, business_id).mark_cluster_questions(
        cluster_id, UnansweredQuestionStatus.resolved
    )

    db.commit()
    db.refresh(knowledge_item)
    db.refresh(cluster)
    return knowledge_item, cluster


def dismiss_cluster(db: Session, business_id: int, cluster_id: int) -> QuestionCluster | None:
    cluster = QuestionClusterRepository(db, business_id).get(cluster_id)
    if cluster is None:
        return None

    cluster.status = UnansweredQuestionStatus.dismissed
    UnansweredQuestionRepository(db, business_id).mark_cluster_questions(
        cluster_id, UnansweredQuestionStatus.dismissed
    )

    db.commit()
    db.refresh(cluster)
    return cluster
