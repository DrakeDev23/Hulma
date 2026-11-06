import os
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from app.config import settings
from app.main import should_enable_api_docs
from app.security import validate_auth_config

class ProductionStartupGuardTests(unittest.TestCase):

    def setUp(self):
        self._prev = {'app_env': settings.app_env, 'debug': settings.debug, 'allow_dev_tokens': settings.allow_dev_tokens, 'secret_key': settings.secret_key, 'clerk_issuer': settings.clerk_issuer, 'clerk_jwks_url': settings.clerk_jwks_url, 'clerk_audience': settings.clerk_audience, 'require_clerk_audience': settings.require_clerk_audience, 'allowed_origins': settings.allowed_origins}

    def tearDown(self):
        for key, value in self._prev.items():
            setattr(settings, key, value)

    def _set_secure_prod_baseline(self):
        settings.app_env = 'production'
        settings.debug = False
        settings.allow_dev_tokens = False
        settings.secret_key = 'a' * 48
        settings.clerk_issuer = 'https://clerk.example.com'
        settings.clerk_jwks_url = 'https://clerk.example.com/.well-known/jwks.json'
        settings.clerk_audience = ''
        settings.require_clerk_audience = False
        settings.allowed_origins = 'https://hulma.vercel.app'

    def test_secure_production_config_passes(self):
        self._set_secure_prod_baseline()
        validate_auth_config()

    def test_weak_secret_key_rejected_in_production(self):
        self._set_secure_prod_baseline()
        settings.secret_key = 'replace-me-with-a-strong-secret'
        with self.assertRaises(RuntimeError) as ctx:
            validate_auth_config()
        self.assertIn('SECRET_KEY', str(ctx.exception))

    def test_short_secret_key_rejected_in_production(self):
        self._set_secure_prod_baseline()
        settings.secret_key = 'short-secret'
        with self.assertRaises(RuntimeError):
            validate_auth_config()

    def test_debug_true_rejected_in_production(self):
        self._set_secure_prod_baseline()
        settings.debug = True
        with self.assertRaises(RuntimeError) as ctx:
            validate_auth_config()
        self.assertIn('DEBUG', str(ctx.exception))

    def test_allow_dev_tokens_rejected_in_production(self):
        self._set_secure_prod_baseline()
        settings.allow_dev_tokens = True
        with self.assertRaises(RuntimeError) as ctx:
            validate_auth_config()
        self.assertIn('ALLOW_DEV_TOKENS', str(ctx.exception))

    def test_http_clerk_urls_rejected_in_production(self):
        self._set_secure_prod_baseline()
        settings.clerk_issuer = 'http://clerk.example.com'
        with self.assertRaises(RuntimeError) as ctx:
            validate_auth_config()
        self.assertIn('CLERK_ISSUER', str(ctx.exception))
        settings.clerk_issuer = 'https://clerk.example.com'
        settings.clerk_jwks_url = 'http://clerk.example.com/.well-known/jwks.json'
        with self.assertRaises(RuntimeError) as ctx2:
            validate_auth_config()
        self.assertIn('CLERK_JWKS_URL', str(ctx2.exception))

    def test_missing_clerk_config_rejected_in_production(self):
        self._set_secure_prod_baseline()
        settings.clerk_issuer = ''
        with self.assertRaises(RuntimeError) as ctx:
            validate_auth_config()
        self.assertIn('CLERK_ISSUER', str(ctx.exception))

    def test_missing_clerk_audience_ok_for_default_session_tokens(self):
        self._set_secure_prod_baseline()
        settings.clerk_audience = ''
        settings.require_clerk_audience = False
        validate_auth_config()

    def test_require_clerk_audience_true_needs_audience_value(self):
        self._set_secure_prod_baseline()
        settings.require_clerk_audience = True
        settings.clerk_audience = ''
        with self.assertRaises(RuntimeError) as ctx:
            validate_auth_config()
        self.assertIn('CLERK_AUDIENCE', str(ctx.exception))

    def test_docs_disabled_in_production_even_with_debug(self):
        self.assertFalse(should_enable_api_docs('production', True))
        self.assertFalse(should_enable_api_docs('prod', True))
        self.assertFalse(should_enable_api_docs('production', False))

    def test_docs_enabled_only_in_non_prod_debug(self):
        self.assertTrue(should_enable_api_docs('development', True))
        self.assertFalse(should_enable_api_docs('development', False))
if __name__ == '__main__':
    unittest.main()
