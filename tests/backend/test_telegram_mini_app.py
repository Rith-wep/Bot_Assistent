import hashlib
import hmac
import json
import time
from urllib.parse import urlencode

import pytest

from app.services.telegram_mini_app import verify_init_data


def signed_init_data(bot_token: str, payload: dict) -> str:
    data_check_string = "\n".join(f"{key}={payload[key]}" for key in sorted(payload))
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    payload["hash"] = hmac.new(
        secret_key,
        data_check_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return urlencode(payload)


def test_verify_init_data_accepts_valid_signature():
    bot_token = "123456:test-token"
    init_data = signed_init_data(
        bot_token,
        {
            "auth_date": str(int(time.time())),
            "query_id": "abc",
            "user": json.dumps({"id": 42, "username": "buyer", "first_name": "Sok"}),
        },
    )

    identity = verify_init_data(init_data, bot_token)

    assert identity.user_id == 42
    assert identity.external_customer_id == "42"
    assert identity.username == "buyer"
    assert identity.first_name == "Sok"


def test_verify_init_data_rejects_tampering():
    bot_token = "123456:test-token"
    init_data = signed_init_data(
        bot_token,
        {
            "auth_date": str(int(time.time())),
            "user": json.dumps({"id": 42, "username": "buyer"}),
        },
    )
    tampered = init_data.replace("buyer", "attacker")

    with pytest.raises(ValueError, match="Invalid Telegram initData signature"):
        verify_init_data(tampered, bot_token)
