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
    env = (settings.app_env or '').strip().lower()
    if env in {'production', 'prod'}:
        missing = []
        if not settings.clerk_issuer or not settings.clerk_issuer.strip():
            missing.append('CLERK_ISSUER')
        if not settings.clerk_jwks_url or not settings.clerk_jwks_url.strip():
            missing.append('CLERK_JWKS_URL')
        if not settings.allowed_origins or not settings.allowed_origins.strip():
            missing.append('ALLOWED_ORIGINS')
        if settings.require_clerk_audience and (not (settings.clerk_audience or '').strip()):
            missing.append('CLERK_AUDIENCE (required because REQUIRE_CLERK_AUDIENCE=true)')
        if missing:
            raise RuntimeError(f"Missing required Clerk authentication configuration when app_env == 'production': {', '.join(missing)}")
        jwks = settings.clerk_jwks_url.strip().lower()
        issuer = settings.clerk_issuer.strip().lower()
        if not jwks.startswith('https://'):
            raise RuntimeError('CLERK_JWKS_URL must use HTTPS in production')
        if not issuer.startswith('https://'):
            raise RuntimeError('CLERK_ISSUER must use HTTPS in production')
        weak_secrets = {'', 'replace-me-with-a-strong-secret', 'REPLACE_WITH_RANDOM_64_CHAR_SECRET', 'changeme', 'secret'}
        if (settings.secret_key or '').strip() in weak_secrets or len((settings.secret_key or '').strip()) < 32:
            raise RuntimeError('SECRET_KEY must be a strong unique value (min 32 chars) in production')
        if settings.debug:
            raise RuntimeError('DEBUG must be false when APP_ENV is production')
        if settings.allow_dev_tokens:
            raise RuntimeError('ALLOW_DEV_TOKENS must be false when APP_ENV is production')

@lru_cache(maxsize=1)
def get_clerk_jwks() -> list[dict]:
    if not settings.clerk_jwks_url or not settings.clerk_jwks_url.strip():
        if settings.app_env.lower() == 'production':
            raise RuntimeError("CLERK_JWKS_URL must be configured when app_env == 'production'")
        raise RuntimeError('CLERK_JWKS_URL is not configured')
    try:
        response = httpx.get(settings.clerk_jwks_url.strip(), timeout=10)
        response.raise_for_status()
        return response.json().get('keys', [])
    except Exception as exc:
        logger.error("JWKS fetch failed from URL '%s': %s", settings.clerk_jwks_url.strip(), exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail='Authentication service temporarily unavailable') from exc

def _dev_tokens_allowed() -> bool:
    env = (settings.app_env or '').strip().lower()
    if env in {'production', 'prod'}:
        return False
    if not settings.allow_dev_tokens:
        return False
    if env not in {'development', 'dev', 'local', 'test'}:
        return False
    return True

def verify_clerk_jwt(token: str) -> dict:
    if token.startswith('dev_token_'):
        if not _dev_tokens_allowed():
            logger.warning('Rejected dev_token_* bearer: ALLOW_DEV_TOKENS is disabled or APP_ENV is not a local/dev value')
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'})
        sub = token.removeprefix('dev_token_').strip()
        if not sub or len(sub) > 128 or any((c in sub for c in ('/', '\\', ' ', '\n', '\r', '\t'))):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'})
        return {'sub': sub, 'email': f'{sub}@example.com', 'azp': 'http://localhost:5173'}
    if not settings.clerk_issuer or not settings.clerk_issuer.strip():
        if settings.app_env.lower() == 'production':
            raise RuntimeError("CLERK_ISSUER must be configured when app_env == 'production'")
        raise RuntimeError('CLERK_ISSUER is not configured')
    if not settings.clerk_jwks_url or not settings.clerk_jwks_url.strip():
        if settings.app_env.lower() == 'production':
            raise RuntimeError("CLERK_JWKS_URL must be configured when app_env == 'production'")
        raise RuntimeError('CLERK_JWKS_URL is not configured')
    try:
        header = jwt.get_unverified_header(token)
    except Exception as exc:
        logger.warning('Clerk JWT validation failed: header extraction error: %s', exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'}) from exc
    key_id = header.get('kid')
    if not key_id:
        logger.warning('Clerk JWT validation failed: missing required kid in header')
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'})
    keys = get_clerk_jwks()
    matching_key = next((key for key in keys if key.get('kid') == key_id), None)
    if matching_key is None:
        get_clerk_jwks.cache_clear()
        keys = get_clerk_jwks()
        matching_key = next((key for key in keys if key.get('kid') == key_id), None)
        if matching_key is None:
            logger.warning("Clerk JWT validation failed: no matching JWKS key found for kid='%s'", key_id)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'})
    alg = header.get('alg')
    if alg != 'RS256':
        logger.warning("Clerk JWT validation failed: unsupported algorithm '%s' (only RS256 accepted)", alg)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'})
    matching_jwk = PyJWK.from_dict(matching_key)
    public_key = matching_jwk.key
    base_issuer = settings.clerk_issuer.strip().rstrip('/')
    allowed_issuers = [base_issuer, f'{base_issuer}/']
    decode_kwargs = {'jwt': token, 'key': public_key, 'algorithms': ['RS256'], 'issuer': allowed_issuers, 'leeway': 10}
    options = {'verify_signature': True, 'verify_exp': True, 'verify_iss': True}
    configured_audience = (settings.clerk_audience or '').strip()
    if configured_audience:
        token_aud = None
        try:
            unverified_claims = jwt.decode(token, options={'verify_signature': False, 'verify_exp': False, 'verify_iss': False, 'verify_aud': False})
            token_aud = unverified_claims.get('aud')
        except Exception:
            token_aud = None
        if token_aud is not None or settings.require_clerk_audience:
            decode_kwargs['audience'] = configured_audience
            options['verify_aud'] = True
        else:
            options['verify_aud'] = False
    else:
        options['verify_aud'] = False
    decode_kwargs['options'] = options
    try:
        claims = jwt.decode(**decode_kwargs)
    except jwt.ExpiredSignatureError:
        logger.warning('Clerk JWT validation failed: token has expired (exp)')
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'})
    except (jwt.ImmatureSignatureError, jwt.InvalidIssuedAtError) as exc:
        logger.warning('Clerk JWT validation failed: clock skew error (iat/nbf): %s', exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'}) from exc
    except jwt.InvalidSignatureError:
        logger.warning('Clerk JWT validation failed: signature verification failed')
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'})
    except jwt.InvalidIssuerError:
        token_iss = None
        try:
            unverified_claims = jwt.decode(token, options={'verify_signature': False, 'verify_exp': False, 'verify_iss': False, 'verify_aud': False})
            token_iss = unverified_claims.get('iss')
        except Exception:
            pass
        logger.warning("Clerk JWT validation failed: invalid issuer. Token iss='%s', expected='%s'", token_iss, settings.clerk_issuer.strip())
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'})
    except jwt.InvalidAudienceError:
        logger.warning("Clerk JWT validation failed: invalid audience (aud). Expected='%s'", settings.clerk_audience.strip())
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'})
    except PyJWTError as exc:
        logger.warning('Clerk JWT validation failed: PyJWT decode error: %s', exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'}) from exc
    azp = claims.get('azp')
    if not azp:
        logger.warning('Clerk JWT validation failed: missing required azp claim')
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'})
    allowed_origins = [o.strip().rstrip('/') for o in settings.allowed_origins.split(',') if o.strip()]
    cors_origins = [o.strip().rstrip('/') for o in settings.cors_origins.split(',') if o.strip() and o.strip() != '*']
    clean_azp = str(azp).strip().rstrip('/')
    azp_allowed = clean_azp in allowed_origins or clean_azp in cors_origins
    if not azp_allowed and settings.cors_origin_regex:
        if re.fullmatch(settings.cors_origin_regex.strip(), clean_azp):
            azp_allowed = True
    if not azp_allowed and (settings.app_env.lower() != 'production' or settings.debug):
        if re.match('^https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?$', clean_azp):
            azp_allowed = True
    if not azp_allowed:
        logger.warning("Clerk JWT validation failed: unauthorized azp='%s'. Allowed origins=%s, regex='%s'", clean_azp, allowed_origins, settings.cors_origin_regex)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'})
    return claims

def get_current_user(request: Request, creds: HTTPAuthorizationCredentials=Depends(bearer_scheme)) -> dict:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Missing bearer token', headers={'WWW-Authenticate': 'Bearer'})
    claims = verify_clerk_jwt(creds.credentials)
    if not isinstance(claims, dict) or not claims.get('sub'):
        logger.warning("Clerk JWT validation failed: missing subject identifier ('sub')")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid or expired token', headers={'WWW-Authenticate': 'Bearer'})
    return claims
