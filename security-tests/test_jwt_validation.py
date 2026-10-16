import os
import sys
import unittest
import jwt
import jwt.algorithms as algs
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.config import settings
from app.security import verify_clerk_jwt


import app.security as sec_module

# Generate test RSA key
_test_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_test_public_key = _test_private_key.public_key()
_test_jwk = eval(algs.RSAAlgorithm.to_jwk(_test_public_key))
_test_jwk["kid"] = "test_clerk_kid"

# Mock get_clerk_jwks to return our test JWK
sec_module.get_clerk_jwks = lambda: [_test_jwk]
settings.clerk_issuer = "https://clerk.test.example"
settings.clerk_jwks_url = "https://clerk.test.example/.well-known/jwks.json"
settings.allowed_origins = "https://hulma.vercel.app,http://localhost:5173,http://localhost:5174"
settings.clerk_audience = ""


def _mint_test_token(claims: dict, alg="RS256", kid="test_clerk_kid"):
    headers = {"kid": kid, "alg": alg}
    return jwt.encode(claims, _test_private_key, algorithm=alg, headers=headers)


class JwtAzpValidationTests(unittest.TestCase):
    def test_valid_token_with_allowed_azp_succeeds(self):
        token = _mint_test_token({
            "sub": "user_valid_123",
            "iss": "https://clerk.test.example",
            "azp": "http://localhost:5173",
            "exp": 9999999999,
        })
        claims = verify_clerk_jwt(token)
        self.assertEqual(claims["sub"], "user_valid_123")
        self.assertEqual(claims["azp"], "http://localhost:5173")

    def test_missing_azp_rejected(self):
        token = _mint_test_token({
            "sub": "user_valid_123",
            "iss": "https://clerk.test.example",
            "exp": 9999999999,
        })
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Invalid or expired token")

    def test_wrong_azp_origin_rejected(self):
        token = _mint_test_token({
            "sub": "user_valid_123",
            "iss": "https://clerk.test.example",
            "azp": "https://malicious-phishing-site.com",
            "exp": 9999999999,
        })
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Invalid or expired token")

    def test_wrong_issuer_rejected(self):
        token = _mint_test_token({
            "sub": "user_valid_123",
            "iss": "https://fake-issuer.example",
            "azp": "http://localhost:5173",
            "exp": 9999999999,
        })
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Invalid or expired token")

    def test_expired_token_rejected(self):
        token = _mint_test_token({
            "sub": "user_valid_123",
            "iss": "https://clerk.test.example",
            "azp": "http://localhost:5173",
            "exp": 1000000000,  # Expired in 2001
        })
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Invalid or expired token")

    def test_clock_skew_leeway_accepted(self):
        import time
        now = int(time.time())
        token = _mint_test_token({
            "sub": "user_valid_123",
            "iss": "https://clerk.test.example",
            "azp": "http://localhost:5173",
            "exp": now + 3600,
            "iat": now + 5,  # 5 seconds in future (clock skew)
            "nbf": now + 5,
        })
        claims = verify_clerk_jwt(token)
        self.assertEqual(claims["sub"], "user_valid_123")

    def test_legitimate_preview_url_accepted(self):
        token = _mint_test_token({
            "sub": "user_valid_123",
            "iss": "https://clerk.test.example",
            "azp": "https://hulma-git-feature-new-drakedev23s-projects.vercel.app",
            "exp": 9999999999,
        })
        claims = verify_clerk_jwt(token)
        self.assertEqual(claims["azp"], "https://hulma-git-feature-new-drakedev23s-projects.vercel.app")

    def test_evil_suffix_bypass_rejected(self):
        token = _mint_test_token({
            "sub": "user_valid_123",
            "iss": "https://clerk.test.example",
            "azp": "https://hulma-drakedev23s-projects.vercel.app.evil.com",
            "exp": 9999999999,
        })
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Invalid or expired token")

    def test_evil_prefix_bypass_rejected(self):
        token = _mint_test_token({
            "sub": "user_valid_123",
            "iss": "https://clerk.test.example",
            "azp": "https://evil.com/https://hulma-drakedev23s-projects.vercel.app",
            "exp": 9999999999,
        })
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt(token)
        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Invalid or expired token")


if __name__ == "__main__":
    unittest.main()
