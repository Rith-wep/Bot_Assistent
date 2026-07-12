"""Weekly Intelligence — Monday summary job. CLI entry point.

Sends every active business's owner a short Telegram summary of last
week's activity (app/services/weekly_summary.py does the actual work, one
business at a time). Guarded by businesses.last_summary_sent so re-running
never double-sends for the same ISO week. One business's failure is caught
and logged with its business_id; it never stops the others. See CLAUDE.md's
Weekly Intelligence section.

Usage:
    python -m app.jobs.weekly_summary                     # every active business, real schedule
    python -m app.jobs.weekly_summary --business-id 1      # single business, for manual testing
    python -m app.jobs.weekly_summary --business-id 1 --force  # ignore the once-per-week guard
"""
import argparse
import asyncio
import logging

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.business import Business, BusinessStatus
from app.services.weekly_summary import send_weekly_summary

logger = logging.getLogger(__name__)


def _active_businesses(db: Session, business_id: int | None) -> list[Business]:
    query = db.query(Business).filter(Business.status == BusinessStatus.active)
    if business_id is not None:
        query = query.filter(Business.id == business_id)
    return query.all()


async def run(business_id: int | None = None, force: bool = False) -> None:
    db = SessionLocal()
    try:
        businesses = _active_businesses(db, business_id)
        if not businesses:
            logger.info("No active businesses to summarize.")
            return

        for business in businesses:
            try:
                sent = await send_weekly_summary(db, business, force=force)
                if sent:
                    logger.info("business_id=%s: weekly summary sent", business.id)
                else:
                    logger.info(
                        "business_id=%s: skipped (already sent this week, or no linked bot)",
                        business.id,
                    )
            except Exception:
                db.rollback()
                logger.exception(
                    "business_id=%s: weekly summary job failed; other businesses are unaffected",
                    business.id,
                )
    finally:
        db.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Weekly Intelligence Monday summary job")
    parser.add_argument(
        "--business-id", type=int, default=None, help="Run for a single business only (testing)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Send even if already sent this week (testing) — still updates last_summary_sent",
    )
    args = parser.parse_args()
    asyncio.run(run(args.business_id, args.force))


if __name__ == "__main__":
    main()
