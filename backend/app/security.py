from functools import lru_cache
import re
import httpx
import jwt
from jwt import PyJWK, PyJWTError
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

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

        alg = header.get("alg")
        if alg != "RS256":
            raise ValueError("Unsupported JWT algorithm: only RS256 is accepted")

        matching_jwk = PyJWK.from_dict(matching_key)
        public_key = matching_jwk.key

        decode_kwargs = {
            "jwt": token,
            "key": public_key,
            "algorithms": ["RS256"],
            "issuer": settings.clerk_issuer.strip(),
        }

        options = {"verify_signature": True, "verify_exp": True, "verify_iss": True}

        if settings.clerk_audience and settings.clerk_audience.strip():
            decode_kwargs["audience"] = settings.clerk_audience.strip()
            options["verify_aud"] = True
        else:
            options["verify_aud"] = False

        decode_kwargs["options"] = options

        claims = jwt.decode(**decode_kwargs)

        azp = claims.get("azp")
        if not azp:
            raise ValueError("Missing required azp (authorized party) claim in token")

        allowed_origins = [o.strip().rstrip("/") for o in settings.allowed_origins.split(",") if o.strip()]
        clean_azp = str(azp).strip().rstrip("/")
        azp_allowed = clean_azp in allowed_origins
        if not azp_allowed and settings.cors_origin_regex:
            if re.fullmatch(settings.cors_origin_regex.strip(), clean_azp):
                azp_allowed = True

        if not azp_allowed:
            raise ValueError(f"Invalid azp claim: origin '{azp}' is not authorized")

        return claims
    except HTTPException:
        raise
    except (PyJWTError, TypeError, ValueError, KeyError, AttributeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Clerk token: {exc}",
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
    if not isinstance(claims, dict) or not claims.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims: missing subject identifier",
        )
    return claims
