"""Direct Telegram Bot API calls needed outside the python-telegram-bot
Application lifecycle — currently just token validation during onboarding.
"""
import httpx

TELEGRAM_API_BASE = "https://api.telegram.org"


def get_bot_info(token: str) -> dict | None:
    """Calls Telegram's getMe. Returns {'username', 'first_name'} if the
    token is valid, else None (invalid token, unreachable API, etc).
    """
    try:
        response = httpx.get(f"{TELEGRAM_API_BASE}/bot{token}/getMe", timeout=10)
        data = response.json()
    except Exception:
        return None

    if not data.get("ok"):
        return None

    result = data["result"]
    return {"username": result.get("username"), "first_name": result.get("first_name")}
