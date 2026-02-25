"""
Manage PyTest fixtures.
"""

pytest_plugins = [
    "tests.fixtures.database_management",
    "tests.fixtures.word_payloads",
]
