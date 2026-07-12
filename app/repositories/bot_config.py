from sqlalchemy.orm import Session

from app.models.bot_config import BotConfig
from app.repositories.base import TenantRepository


class BotConfigRepository(TenantRepository[BotConfig]):
    model = BotConfig

    def get_for_business(self) -> BotConfig | None:
        return self._scoped_query().first()


def get_by_username_excluding_business(
    db: Session, bot_username: str, exclude_business_id: int
) -> BotConfig | None:
    """Cross-tenant by design: a Telegram bot token can only ever belong to
    one business, so connecting one already claimed elsewhere must be
    rejected — this is the lookup that catches that, checked against every
    business, not just the caller's own.
    """
    return (
        db.query(BotConfig)
        .filter(BotConfig.bot_username == bot_username, BotConfig.business_id != exclude_business_id)
        .first()
    )
