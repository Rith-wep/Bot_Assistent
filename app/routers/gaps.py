from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.models.question_cluster import QuestionCluster
from app.schemas.gaps import ClusterOut, ResolveClusterRequest, ResolveClusterResponse
from app.services import gaps

router = APIRouter(prefix="/api/gaps", tags=["gaps"])


def _cluster_out(cluster: QuestionCluster) -> ClusterOut:
    return ClusterOut(
        id=cluster.id,
        label_en=cluster.label_en,
        label_km=cluster.label_km,
        question_count=cluster.question_count,
        sample_questions=cluster.sample_questions or [],
        suggested_category=gaps.guess_category(cluster.label_en),
        first_seen=cluster.first_seen,
        last_seen=cluster.last_seen,
    )


@router.get("", response_model=list[ClusterOut])
def list_gaps(
    limit: int = Query(5, ge=1, le=20),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ClusterOut]:
    clusters = gaps.list_open_clusters(db, current_user.business_id, limit=limit)
    return [_cluster_out(c) for c in clusters]


@router.post("/{cluster_id}/resolve", response_model=ResolveClusterResponse)
def resolve_gap(
    cluster_id: int,
    payload: ResolveClusterRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ResolveClusterResponse:
    result = gaps.resolve_cluster(db, current_user.business_id, cluster_id, payload.model_dump())
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gap not found")
    knowledge_item, cluster = result
    return ResolveClusterResponse(knowledge_item=knowledge_item, cluster=_cluster_out(cluster))


@router.post("/{cluster_id}/dismiss", response_model=ClusterOut)
def dismiss_gap(
    cluster_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClusterOut:
    cluster = gaps.dismiss_cluster(db, current_user.business_id, cluster_id)
    if cluster is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gap not found")
    return _cluster_out(cluster)
