from app.models.question_cluster import QuestionCluster
from app.models.unanswered_question import UnansweredQuestionStatus
from app.repositories.base import TenantRepository


class QuestionClusterRepository(TenantRepository[QuestionCluster]):
    model = QuestionCluster

    def list_open(self) -> list[QuestionCluster]:
        return (
            self._scoped_query()
            .filter(QuestionCluster.status == UnansweredQuestionStatus.open)
            .order_by(QuestionCluster.id)
            .all()
        )

    def list_open_by_count(self) -> list[QuestionCluster]:
        """Top gaps first, for the dashboard card."""
        return (
            self._scoped_query()
            .filter(QuestionCluster.status == UnansweredQuestionStatus.open)
            .order_by(QuestionCluster.question_count.desc(), QuestionCluster.id)
            .all()
        )
