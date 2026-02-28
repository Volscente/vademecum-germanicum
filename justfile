#!/usr/bin/env just --justfile

# Load from '.env' file
set dotenv-load

# Define the root directory based on where this justfile is located
ROOT_DIR := justfile_directory()

# List available commands
help:
    @just --justfile {{justfile()}} --list --unsorted

# Helper to verify we are in the root before running docker commands
@check_root:
    #!/usr/bin/env bash
    if [ "$PWD" != "{{ROOT_DIR}}" ]; then \
        echo "Error: Command must be run from the root directory: {{ROOT_DIR}}"; \
        exit 1; \
    fi

# Docker-compose build -> Create the docker-compose stack
run_backend: check_root
    docker-compose up --build

# Docker-compose build (recreate)
run_backend_recreate: check_root
    docker-compose up --build --force-recreate

# Backend Unit tests -> Run tests in the docker-compose stack
run_tests: check_root
    # Create docker-compose stack and destroy after finish
    # Run the uv in the "backend" workspace
    docker-compose run --rm --build backend uv run --package backend pytest backend/tests

# Run frontend dev server
run_frontend: check_root
    cd frontend && npm run dev