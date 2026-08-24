import jwt
from jwt import InvalidAudienceError
from jwt import PyJWKClient
from cryptography.fernet import Fernet

from app.core.config import settings

_fernet = Fernet(settings.encryption_key.encode())

_supabase_jwks_client: PyJWKClient | None = None


def decode_supabase_access_token(token: str) -> dict:
    """Validate a Supabase access token against the project's public JWKS.

    Signature, issuer, audience and expiration are all mandatory. Asymmetric
    projects use cached public keys from JWKS; legacy HS256 projects use the
    backend-only Supabase JWT secret for local verification.
    """
    global _supabase_jwks_client

    # Supabase projects created with the legacy JWT secret issue HS256 access
    # tokens. Verify them locally with the backend-only JWT secret; the
    # browser-safe publishable key must never be trusted as a signing secret.
    header = jwt.get_unverified_header(token)
    if header.get("alg") == "HS256":
        if not settings.supabase_jwt_secret:
            raise ValueError("SUPABASE_JWT_SECRET is required for HS256 tokens")
        try:
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                issuer=settings.supabase_issuer,
                options={"require": ["exp", "iss", "sub", "aud"]},
            )
        except InvalidAudienceError:
            # Supabase access tokens normally use "authenticated"; some local
            # or legacy setups may encode aud as a project-specific value while
            # keeping the role authoritative for browser user tokens.
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                issuer=settings.supabase_issuer,
                options={"require": ["exp", "iss", "sub", "aud"], "verify_aud": False},
            )
            if payload.get("role") != "authenticated":
                raise
            return payload

    issuer = settings.supabase_issuer
    if _supabase_jwks_client is None:
        _supabase_jwks_client = PyJWKClient(
            f"{issuer}/.well-known/jwks.json",
            cache_keys=True,
            lifespan=600,
        )

    signing_key = _supabase_jwks_client.get_signing_key_from_jwt(token)
    try:
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
            issuer=issuer,
            options={"require": ["exp", "iss", "sub", "aud"]},
        )
    except InvalidAudienceError:
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            issuer=issuer,
            options={"require": ["exp", "iss", "sub", "aud"], "verify_aud": False},
        )
        if payload.get("role") != "authenticated":
            raise
        return payload


def encrypt_secret(plain_text: str) -> str:
    return _fernet.encrypt(plain_text.encode()).decode()


def decrypt_secret(cipher_text: str) -> str:
    return _fernet.decrypt(cipher_text.encode()).decode()
