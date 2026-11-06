import os
import subprocess
import sys
import unittest
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEST = os.path.join(ROOT, 'security-tests', 'test_safe_url.mjs')

class SafeUrlNodeRunnerTests(unittest.TestCase):

    def test_safe_url_js_suite_passes(self):
        result = subprocess.run(['node', '--test', TEST], cwd=ROOT, capture_output=True, text=True, timeout=60)
        if result.returncode != 0:
            self.fail(f'Node safeUrl tests failed.\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}')
if __name__ == '__main__':
    unittest.main()
