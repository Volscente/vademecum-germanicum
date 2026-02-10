#!/usr/bin/env just --justfile

# Load from '.env' file
set dotenv-load

# List available commands
help:
    @just --justfile {{justfile()}} --list --unsorted

# Docker-compose build
docker_build:
    docker-compose up --build

# Docker-compose build (recreate)
docker_build_recreate:
    docker-compose up --build --force-recreate