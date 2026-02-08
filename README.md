# vademecum-germanicum

An AI-augmented, data-driven companion for mastering German. A custom-built vocabulary engine featuring automated linguistic enrichment and spaced-repetition logic.

# Introduction

## Workspaces

The project is structured in different workspaces to ensure domain separation between code components.

There is one single shared `uv.lock` file for all workspace members in order to ensure libraries versions compatibility across them.

The `pyproject.toml` are organised:

- `root/pyproject.toml`: It defines the global rules: who the members are, the required Python version for the whole repo, and shared dev tools (like Ruff for linting). It does not include dependencies.
- `backend/pyproject.toml`: It defines the backend workspace's dependencies.

Commands:

- Install dependency `uv add --package backend <dependency>`
- Run backend `uv run --package backend uvicorn main:app --reload`
