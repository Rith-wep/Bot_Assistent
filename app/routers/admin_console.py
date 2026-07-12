from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_current_admin_user
from app.db.session import get_db
from app.models.business import Business
from app.models.question_cluster import QuestionCluster
from app.models.unanswered_question import UnansweredQuestionStatus
from app.schemas.admin_console import AdminBusinessOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/businesses", response_model=list[AdminBusinessOut])
def list_businesses(
    _admin: CurrentUser = Depends(get_current_admin_user), db: Session = Depends(get_db)
) -> list[AdminBusinessOut]:
    """Not tenant-scoped by design: this IS the cross-tenant operator view,
    gated by get_current_admin_user (an email allow-list) instead of being
    scoped to a single business like every other endpoint in this app.
    """
    businesses = (
        db.query(Business)
        .filter(Business.is_demo.is_(False))
        .order_by(Business.created_at.desc())
        .all()
    )
    cluster_counts = dict(
        db.query(QuestionCluster.business_id, func.count(QuestionCluster.id))
        .filter(QuestionCluster.status == UnansweredQuestionStatus.open)
        .group_by(QuestionCluster.business_id)
        .all()
    )
    return [
        AdminBusinessOut(
            id=b.id,
            name=b.name,
            status=b.status,
            plan=b.plan,
            open_cluster_count=cluster_counts.get(b.id, 0),
            last_summary_sent=b.last_summary_sent,
            created_at=b.created_at,
        )
        for b in businesses
    ]
