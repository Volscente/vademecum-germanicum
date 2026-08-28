"""
Manage PyTest fixtures.
"""

pytest_plugins = [
    "tests.fixtures.database_management",
    "tests.fixtures.word_payloads",
    "tests.fixtures.resource_payloads",
    "tests.fixtures.topic_payloads",
]
