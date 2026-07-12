"""Nightly Weekly Intelligence clustering job — CLI entry point.

Groups every business's new unanswered_questions into question_clusters
(app/services/clustering.py does the actual work, one business at a time).
Safe to re-run: only unclustered open questions are ever touched, so a
re-run merges into existing clusters instead of duplicating them. One
business's failure is caught and logged with its business_id; it never
stops the others. See CLAUDE.md's Weekly Intelligence section.

Usage:
    python -m app.jobs.cluster_unanswered                  # every business with new questions
    python -m app.jobs.cluster_unanswered --business-id 1  # single business, for manual testing
"""
import argparse
import asyncio
import logging

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.unanswered_question import UnansweredQuestion, UnansweredQuestionStatus
from app.services.clustering import cluster_business

logger = logging.getLogger(__name__)


def _business_ids_with_new_questions(db: Session) -> list[int]:
    """Not tenant-scoped by design: this is the bootstrap lookup that discovers
    which businesses have unclustered open questions to process this run —
    same exception as the bot engine's active-bot-config loader.
    """
    rows = (
        db.query(UnansweredQuestion.business_id)
        .filter(UnansweredQuestion.status == UnansweredQuestionStatus.open)
        .filter(UnansweredQuestion.cluster_id.is_(None))
        .distinct()
        .all()
    )
    return [row[0] for row in rows]


async def run(business_id: int | None = None) -> None:
    db = SessionLocal()
    try:
        business_ids = [business_id] if business_id else _business_ids_with_new_questions(db)
        if not business_ids:
            logger.info("No businesses with new unanswered questions to cluster.")
            return

        for bid in business_ids:
            try:
                count = await cluster_business(db, bid)
                logger.info("business_id=%s: clustered %d new question(s)", bid, count)
            except Exception:
                db.rollback()
                logger.exception(
                    "business_id=%s: clustering job failed; other businesses are unaffected", bid
                )
    finally:
        db.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Nightly Weekly Intelligence clustering job")
    parser.add_argument(
        "--business-id", type=int, default=None, help="Run for a single business only (testing)"
    )
    args = parser.parse_args()
    asyncio.run(run(args.business_id))


if __name__ == "__main__":
    main()
