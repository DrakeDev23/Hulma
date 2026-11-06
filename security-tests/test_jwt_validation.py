import os
import sys
import unittest
import jwt
import jwt.algorithms as algs
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app.config import settings
from app.security import verify_clerk_jwt
import app.security as sec_module
_test_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_test_public_key = _test_private_key.public_key()
_test_jwk = eval(algs.RSAAlgorithm.to_jwk(_test_public_key))
_test_jwk['kid'] = 'test_clerk_kid'
sec_module.get_clerk_jwks = lambda: [_test_jwk]
settings.clerk_issuer = 'https://clerk.test.example'
settings.clerk_jwks_url = 'https://clerk.test.example/.well-known/jwks.json'
settings.allowed_origins = 'https://hulma.vercel.app,http://localhost:5173,http://localhost:5174'
settings.clerk_audience = ''
settings.require_clerk_audience = False

def _mint_test_token(claims: dict, alg='RS256', kid='test_clerk_kid'):
    headers = {'kid': kid, 'alg': alg}
    return jwt.encode(claims, _test_private_key, algorithm=alg, headers=headers)

class JwtAzpValidationTests(unittest.TestCase):

    def test_valid_token_with_allowed_azp_succeeds(self):
        token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'http://localhost:5173', 'exp': 9999999999})
        claims = verify_clerk_jwt(token)
        self.assertEqual(claims['sub'], 'user_valid_123')
        self.assertEqual(claims['azp'], 'http://localhost:5173')

    def test_missing_azp_rejected(self):
        token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'exp': 9999999999})
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, 'Invalid or expired token')

    def test_wrong_azp_origin_rejected(self):
        token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'https://malicious-phishing-site.com', 'exp': 9999999999})
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, 'Invalid or expired token')

    def test_wrong_issuer_rejected(self):
        token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://fake-issuer.example', 'azp': 'http://localhost:5173', 'exp': 9999999999})
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, 'Invalid or expired token')

    def test_expired_token_rejected(self):
        token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'http://localhost:5173', 'exp': 1000000000})
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, 'Invalid or expired token')

    def test_clock_skew_leeway_accepted(self):
        import time
        now = int(time.time())
        token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'http://localhost:5173', 'exp': now + 3600, 'iat': now + 5, 'nbf': now + 5})
        claims = verify_clerk_jwt(token)
        self.assertEqual(claims['sub'], 'user_valid_123')

    def test_legitimate_preview_url_accepted(self):
        token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'https://hulma-git-feature-new-drakedev23s-projects.vercel.app', 'exp': 9999999999})
        claims = verify_clerk_jwt(token)
        self.assertEqual(claims['azp'], 'https://hulma-git-feature-new-drakedev23s-projects.vercel.app')

    def test_evil_suffix_bypass_rejected(self):
        token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'https://hulma-drakedev23s-projects.vercel.app.evil.com', 'exp': 9999999999})
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, 'Invalid or expired token')

    def test_evil_prefix_bypass_rejected(self):
        token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'https://evil.com/https://hulma-drakedev23s-projects.vercel.app', 'exp': 9999999999})
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, 'Invalid or expired token')

    def test_default_clerk_session_token_without_aud_accepted(self):
        prev_aud = settings.clerk_audience
        prev_req = settings.require_clerk_audience
        try:
            settings.clerk_audience = 'https://hulma-api'
            settings.require_clerk_audience = False
            token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'http://localhost:5173', 'exp': 9999999999})
            claims = verify_clerk_jwt(token)
            self.assertEqual(claims['sub'], 'user_valid_123')
        finally:
            settings.clerk_audience = prev_aud
            settings.require_clerk_audience = prev_req

    def test_missing_aud_rejected_when_require_clerk_audience_enabled(self):
        prev_aud = settings.clerk_audience
        prev_req = settings.require_clerk_audience
        try:
            settings.clerk_audience = 'https://hulma-api'
            settings.require_clerk_audience = True
            token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'http://localhost:5173', 'exp': 9999999999})
            with self.assertRaises(HTTPException) as ctx:
                verify_clerk_jwt(token)
            self.assertEqual(ctx.exception.status_code, 401)
        finally:
            settings.clerk_audience = prev_aud
            settings.require_clerk_audience = prev_req

    def test_matching_audience_accepted_when_configured(self):
        prev_aud = settings.clerk_audience
        prev_req = settings.require_clerk_audience
        try:
            settings.clerk_audience = 'https://hulma-api'
            settings.require_clerk_audience = False
            token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'http://localhost:5173', 'aud': 'https://hulma-api', 'exp': 9999999999})
            claims = verify_clerk_jwt(token)
            self.assertEqual(claims['sub'], 'user_valid_123')
        finally:
            settings.clerk_audience = prev_aud
            settings.require_clerk_audience = prev_req

    def test_localhost_port_accepted_in_development(self):
        prev_env = settings.app_env
        prev_origins = settings.allowed_origins
        try:
            settings.app_env = 'development'
            settings.allowed_origins = 'https://hulma.vercel.app'
            token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'http://localhost:5174', 'exp': 9999999999})
            claims = verify_clerk_jwt(token)
            self.assertEqual(claims['sub'], 'user_valid_123')
        finally:
            settings.app_env = prev_env
            settings.allowed_origins = prev_origins

    def test_invalid_signature_rejected(self):
        other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        token = jwt.encode({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'http://localhost:5173', 'exp': 9999999999}, other_key, algorithm='RS256', headers={'kid': 'test_clerk_kid', 'alg': 'RS256'})
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)

    def test_wrong_audience_rejected_when_aud_present_and_configured(self):
        prev_aud = settings.clerk_audience
        try:
            settings.clerk_audience = 'https://hulma-api'
            token = _mint_test_token({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'http://localhost:5173', 'aud': 'https://wrong-audience', 'exp': 9999999999})
            with self.assertRaises(HTTPException) as ctx:
                verify_clerk_jwt(token)
            self.assertEqual(ctx.exception.status_code, 401)
        finally:
            settings.clerk_audience = prev_aud

    def test_alg_none_or_non_rs256_rejected(self):
        import base64
        import json as _json

        def b64url(data: bytes) -> str:
            return base64.urlsafe_b64encode(data).decode().rstrip('=')
        header = b64url(_json.dumps({'alg': 'none', 'kid': 'test_clerk_kid'}).encode())
        payload = b64url(_json.dumps({'sub': 'user_valid_123', 'iss': 'https://clerk.test.example', 'azp': 'http://localhost:5173', 'exp': 9999999999}).encode())
        token = f'{header}.{payload}.'
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)
if __name__ == '__main__':
    unittest.main()
