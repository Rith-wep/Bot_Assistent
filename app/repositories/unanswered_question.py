from app.models.unanswered_question import UnansweredQuestion, UnansweredQuestionStatus
from app.repositories.base import TenantRepository


class UnansweredQuestionRepository(TenantRepository[UnansweredQuestion]):
    model = UnansweredQuestion

    def list_open_unclustered(self) -> list[UnansweredQuestion]:
        """New questions the clustering job hasn't grouped yet — the only
        ones a re-run needs to look at, which is what keeps re-runs from
        duplicating clusters.
        """
        return (
            self._scoped_query()
            .filter(UnansweredQuestion.status == UnansweredQuestionStatus.open)
            .filter(UnansweredQuestion.cluster_id.is_(None))
            .order_by(UnansweredQuestion.id)
            .all()
        )

    def mark_cluster_questions(self, cluster_id: int, status: UnansweredQuestionStatus) -> int:
        """Bulk-update every question in one cluster to resolved/dismissed,
        keeping it scoped to this tenant like every other method here.
        """
        return (
            self._scoped_query()
            .filter(UnansweredQuestion.cluster_id == cluster_id)
            .update({UnansweredQuestion.status: status}, synchronize_session=False)
        )
