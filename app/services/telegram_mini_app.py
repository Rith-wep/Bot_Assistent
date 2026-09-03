"""Telegram Mini App initData verification.

Telegram signs Mini App launch data with the bot token. Customer-facing Mini
App APIs should verify that signature before trusting any customer identity.
"""

import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl


@dataclass(frozen=True)
class TelegramMiniAppIdentity:
    user_id: int
    username: str | None
    first_name: str | None
    last_name: str | None
    auth_date: int

    @property
    def external_customer_id(self) -> str:
        return str(self.user_id)


def verify_init_data(
    init_data: str,
    bot_token: str,
    *,
    max_age_seconds: int = 24 * 60 * 60,
) -> TelegramMiniAppIdentity:
    """Verify Telegram Mini App initData and return the signed user identity."""
    pairs = dict(parse_qsl(init_data, keep_blank_values=True, strict_parsing=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise ValueError("Missing Telegram initData hash")

    data_check_string = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    expected_hash = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(expected_hash, received_hash):
        raise ValueError("Invalid Telegram initData signature")

    auth_date = int(pairs.get("auth_date") or 0)
    if not auth_date:
        raise ValueError("Missing Telegram initData auth_date")
    if max_age_seconds > 0 and time.time() - auth_date > max_age_seconds:
        raise ValueError("Expired Telegram initData")

    user = json.loads(pairs.get("user") or "{}")
    user_id = user.get("id")
    if not user_id:
        raise ValueError("Missing Telegram Mini App user")

    return TelegramMiniAppIdentity(
        user_id=int(user_id),
        username=user.get("username"),
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
        auth_date=auth_date,
    )
