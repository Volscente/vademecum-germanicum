"""
Manage PyTest fixtures.
"""

import os

# Must be set before backend.auth (imported transitively via backend.main,
# which fixtures.database_management imports below) is loaded — it fails
# fast at import time if these are missing.
os.environ.setdefault("JWT_SECRET", "test-secret-not-for-production-use-only")
os.environ.setdefault("ALLOWED_USERNAMES", "testuser")

pytest_plugins = [
    "tests.fixtures.database_management",
    "tests.fixtures.word_payloads",
    "tests.fixtures.resource_payloads",
    "tests.fixtures.topic_payloads",
    "tests.fixtures.auth",
]
