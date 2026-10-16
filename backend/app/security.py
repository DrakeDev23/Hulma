from functools import lru_cache
import logging
import re
import httpx
import jwt
from jwt import PyJWK, PyJWTError
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

logger = logging.getLogger(__name__)

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
        logger.error("JWKS fetch failed from URL '%s': %s", settings.clerk_jwks_url.strip(), exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service temporarily unavailable",
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
    except Exception as exc:
        logger.warning("Clerk JWT validation failed: header extraction error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    key_id = header.get("kid")
    if not key_id:
        logger.warning("Clerk JWT validation failed: missing required kid in header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    keys = get_clerk_jwks()
    matching_key = next((key for key in keys if key.get("kid") == key_id), None)
    if matching_key is None:
        get_clerk_jwks.cache_clear()
        keys = get_clerk_jwks()
        matching_key = next((key for key in keys if key.get("kid") == key_id), None)
        if matching_key is None:
            logger.warning("Clerk JWT validation failed: no matching JWKS key found for kid='%s'", key_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

    alg = header.get("alg")
    if alg != "RS256":
        logger.warning("Clerk JWT validation failed: unsupported algorithm '%s' (only RS256 accepted)", alg)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    matching_jwk = PyJWK.from_dict(matching_key)
    public_key = matching_jwk.key

    base_issuer = settings.clerk_issuer.strip().rstrip("/")
    allowed_issuers = [base_issuer, f"{base_issuer}/"]

    decode_kwargs = {
        "jwt": token,
        "key": public_key,
        "algorithms": ["RS256"],
        "issuer": allowed_issuers,
        "leeway": 10,
    }

    options = {"verify_signature": True, "verify_exp": True, "verify_iss": True}

    if settings.clerk_audience and settings.clerk_audience.strip():
        decode_kwargs["audience"] = settings.clerk_audience.strip()
        options["verify_aud"] = True
    else:
        options["verify_aud"] = False

    decode_kwargs["options"] = options

    try:
        claims = jwt.decode(**decode_kwargs)
    except jwt.ExpiredSignatureError:
        logger.warning("Clerk JWT validation failed: token has expired (exp)")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.ImmatureSignatureError, jwt.InvalidIssuedAtError) as exc:
        logger.warning("Clerk JWT validation failed: clock skew error (iat/nbf): %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except jwt.InvalidSignatureError:
        logger.warning("Clerk JWT validation failed: signature verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidIssuerError:
        token_iss = None
        try:
            unverified_claims = jwt.decode(
                token,
                options={"verify_signature": False, "verify_exp": False, "verify_iss": False, "verify_aud": False},
            )
            token_iss = unverified_claims.get("iss")
        except Exception:
            pass
        logger.warning(
            "Clerk JWT validation failed: invalid issuer. Token iss='%s', expected='%s'",
            token_iss,
            settings.clerk_issuer.strip(),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidAudienceError:
        logger.warning("Clerk JWT validation failed: invalid audience (aud). Expected='%s'", settings.clerk_audience.strip())
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except PyJWTError as exc:
        logger.warning("Clerk JWT validation failed: PyJWT decode error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    azp = claims.get("azp")
    if not azp:
        logger.warning("Clerk JWT validation failed: missing required azp claim")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    allowed_origins = [o.strip().rstrip("/") for o in settings.allowed_origins.split(",") if o.strip()]
    clean_azp = str(azp).strip().rstrip("/")
    azp_allowed = clean_azp in allowed_origins
    if not azp_allowed and settings.cors_origin_regex:
        if re.fullmatch(settings.cors_origin_regex.strip(), clean_azp):
            azp_allowed = True

    if not azp_allowed:
        logger.warning(
            "Clerk JWT validation failed: unauthorized azp='%s'. Allowed origins=%s, regex='%s'",
            clean_azp,
            allowed_origins,
            settings.cors_origin_regex,
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return claims


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
        logger.warning("Clerk JWT validation failed: missing subject identifier ('sub')")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return claims
