from functools import lru_cache

import httpx
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from jose.jwk import construct

from app.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def get_clerk_jwks() -> list[dict]:
    try:
        response = httpx.get(settings.clerk_jwks_url, timeout=10)
        response.raise_for_status()
        return response.json().get("keys", [])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Could not connect to authentication authority: {exc}",
        ) from exc


def verify_clerk_jwt(token: str) -> dict:
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
        unverified_claims = jwt.get_unverified_claims(token)

        decode_kwargs = {
            "token": token,
            "key": public_key,
            "algorithms": [header.get("alg") or "RS256"],
            "issuer": settings.clerk_issuer,
        }

        token_aud = unverified_claims.get("aud")
        if settings.clerk_audience and token_aud and (token_aud == settings.clerk_audience or (isinstance(token_aud, list) and settings.clerk_audience in token_aud)):
            decode_kwargs["audience"] = settings.clerk_audience
        else:
            decode_kwargs["options"] = {"verify_aud": False}

        return jwt.decode(**decode_kwargs)
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
