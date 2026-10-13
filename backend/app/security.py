import json
from functools import lru_cache

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def get_clerk_jwks() -> list[dict]:
    response = httpx.get(settings.clerk_jwks_url, timeout=10)
    response.raise_for_status()
    return response.json().get("keys", [])


def verify_clerk_jwt(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
        key_id = header.get("kid")
        if not key_id:
            raise ValueError("Missing required kid in token header")

        matching_key = next((key for key in get_clerk_jwks() if key.get("kid") == key_id), None)
        if matching_key is None:
            raise ValueError("No matching JWKS key found")

        public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(matching_key))
        return jwt.decode(
            token,
            public_key,
            algorithms=[header.get("alg")],
            audience=settings.clerk_audience,
            issuer=settings.clerk_issuer,
        )
    except (JWTError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Clerk token",
        ) from exc


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    if creds is None or not creds.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return verify_clerk_jwt(creds.credentials)
