import os
import sys
import unittest
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
from fastapi import HTTPException
from app.config import settings
from app.security import _dev_tokens_allowed, verify_clerk_jwt

class DevTokenRestrictionTests(unittest.TestCase):

    def setUp(self):
        self._prev = {'app_env': settings.app_env, 'allow_dev_tokens': settings.allow_dev_tokens, 'debug': settings.debug}

    def tearDown(self):
        settings.app_env = self._prev['app_env']
        settings.allow_dev_tokens = self._prev['allow_dev_tokens']
        settings.debug = self._prev['debug']

    def test_dev_token_rejected_when_allow_dev_tokens_false(self):
        settings.app_env = 'development'
        settings.allow_dev_tokens = False
        settings.debug = True
        self.assertFalse(_dev_tokens_allowed())
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt('dev_token_user_abc')
        self.assertEqual(ctx.exception.status_code, 401)

    def test_dev_token_accepted_only_when_explicitly_enabled_in_dev(self):
        settings.app_env = 'development'
        settings.allow_dev_tokens = True
        settings.debug = False
        self.assertTrue(_dev_tokens_allowed())
        claims = verify_clerk_jwt('dev_token_user_abc')
        self.assertEqual(claims['sub'], 'user_abc')

    def test_dev_token_rejected_in_production_even_if_flag_true(self):
        settings.app_env = 'production'
        settings.allow_dev_tokens = True
        settings.debug = False
        self.assertFalse(_dev_tokens_allowed())
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt('dev_token_user_abc')
        self.assertEqual(ctx.exception.status_code, 401)

    def test_dev_token_rejected_for_staging_like_env(self):
        settings.app_env = 'staging'
        settings.allow_dev_tokens = True
        self.assertFalse(_dev_tokens_allowed())
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt('dev_token_user_abc')
        self.assertEqual(ctx.exception.status_code, 401)

    def test_dev_token_rejects_malformed_subject(self):
        settings.app_env = 'development'
        settings.allow_dev_tokens = True
        with self.assertRaises(HTTPException) as ctx:
            verify_clerk_jwt('dev_token_user with spaces')
        self.assertEqual(ctx.exception.status_code, 401)
        with self.assertRaises(HTTPException) as ctx2:
            verify_clerk_jwt('dev_token_')
        self.assertEqual(ctx2.exception.status_code, 401)
if __name__ == '__main__':
    unittest.main()
