import jwt
from jwt import PyJWKClient
from cryptography.fernet import Fernet

from app.core.config import settings

_fernet = Fernet(settings.encryption_key.encode())

_supabase_jwks_client: PyJWKClient | None = None


def decode_supabase_access_token(token: str) -> dict:
    """Validate a Supabase access token against the project's public JWKS.

    Signature, issuer, audience and expiration are all mandatory. Public keys
    are cached by PyJWKClient; no Supabase secret key is needed by the API.
    """
    global _supabase_jwks_client

    issuer = settings.supabase_issuer
    if _supabase_jwks_client is None:
        _supabase_jwks_client = PyJWKClient(
            f"{issuer}/.well-known/jwks.json",
            cache_keys=True,
            lifespan=600,
        )

    signing_key = _supabase_jwks_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256", "ES256"],
        audience="authenticated",
        issuer=issuer,
        options={"require": ["exp", "iss", "sub", "aud"]},
    )


def encrypt_secret(plain_text: str) -> str:
    return _fernet.encrypt(plain_text.encode()).decode()


def decrypt_secret(cipher_text: str) -> str:
    return _fernet.decrypt(cipher_text.encode()).decode()
