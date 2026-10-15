from functools import lru_cache

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from jose.jwk import construct

from app.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


def validate_auth_config() -> None:
    if settings.app_env.lower() == "production":
        missing = []
        if not settings.clerk_issuer or not settings.clerk_issuer.strip():
            missing.append("CLERK_ISSUER")
        if not settings.clerk_jwks_url or not settings.clerk_jwks_url.strip():
            missing.append("CLERK_JWKS_URL")
        if missing:
            raise RuntimeError(
                f"Missing required Clerk authentication configuration when app_env == 'production': {', '.join(missing)}"
            )


@lru_cache(maxsize=1)
def get_clerk_jwks() -> list[dict]:
    if not settings.clerk_jwks_url or not settings.clerk_jwks_url.strip():
        if settings.app_env.lower() == "production":
            raise RuntimeError("CLERK_JWKS_URL must be configured when app_env == 'production'")
        raise RuntimeError("CLERK_JWKS_URL is not configured")

    try:
        response = httpx.get(settings.clerk_jwks_url.strip(), timeout=10)
        response.raise_for_status()
        return response.json().get("keys", [])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not connect to authentication authority: {exc}",
        ) from exc


def verify_clerk_jwt(token: str) -> dict:
    if not settings.clerk_issuer or not settings.clerk_issuer.strip():
        if settings.app_env.lower() == "production":
            raise RuntimeError("CLERK_ISSUER must be configured when app_env == 'production'")
        raise RuntimeError("CLERK_ISSUER is not configured")
    if not settings.clerk_jwks_url or not settings.clerk_jwks_url.strip():
        if settings.app_env.lower() == "production":
            raise RuntimeError("CLERK_JWKS_URL must be configured when app_env == 'production'")
        raise RuntimeError("CLERK_JWKS_URL is not configured")

    try:
        header = jwt.get_unverified_header(token)
        key_id = header.get("kid")
        if not key_id:
            raise ValueError("Missing required kid in token header")

        keys = get_clerk_jwks()
        matching_key = next((key for key in keys if key.get("kid") == key_id), None)
        if matching_key is None:
            get_clerk_jwks.cache_clear()
            keys = get_clerk_jwks()
            matching_key = next((key for key in keys if key.get("kid") == key_id), None)
            if matching_key is None:
                raise ValueError("No matching JWKS key found")

        public_key = construct(matching_key)
        decode_kwargs = {
            "token": token,
            "key": public_key,
            "algorithms": [header.get("alg") or "RS256"],
            "issuer": settings.clerk_issuer.strip(),
        }

        options: dict[str, bool] = {}

        if settings.clerk_audience and settings.clerk_audience.strip():
            expected_aud = settings.clerk_audience.strip()
            decode_kwargs["audience"] = expected_aud
        else:
            options["verify_aud"] = False

        decode_kwargs["options"] = options

        claims = jwt.decode(**decode_kwargs)

        if settings.clerk_audience and settings.clerk_audience.strip():
            aud = claims.get("aud")
            expected_aud = settings.clerk_audience.strip()
            if not aud:
                raise ValueError("Missing required audience claim in token")
            if isinstance(aud, str) and aud != expected_aud:
                raise ValueError("Invalid audience claim in token")
            if isinstance(aud, (list, tuple)) and expected_aud not in aud:
                raise ValueError("Invalid audience claim in token")

        return claims
    except HTTPException:
        raise
    except (JWTError, TypeError, ValueError, KeyError, AttributeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Clerk token",
        ) from exc


def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    claims = verify_clerk_jwt(creds.credentials)
    if isinstance(claims, dict):
        if not claims.get("email") and request:
            hdr_email = request.headers.get("x-user-email")
            if hdr_email and "@" in hdr_email and not hdr_email.strip().lower().endswith("@clerk.local"):
                claims["email"] = hdr_email.strip().lower()
        if not claims.get("username") and request:
            hdr_username = request.headers.get("x-user-username")
            if hdr_username and not hdr_username.strip().startswith("user_"):
                claims["username"] = hdr_username.strip()
    return claims
