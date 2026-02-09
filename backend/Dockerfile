# Use a dedicated uv image to just grab the binary (Multi-stage build - Builder image)
FROM astral-sh/uv:0.5.21 AS uv_bin

# Runner image (Multi-stage build)
FROM python:3.13-slim-bookworm

# Install curl for healthchecks and delete apt-get update indices
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy uv binary from the builder image
COPY --from=uv_bin /uv /usr/local/bin/uv

# Set working directory
WORKDIR /app

# Enable bytecode compilation (.pyc) for faster startup and disable dev deps
ENV UV_COMPILE_BYTECODE=1
ENV UV_NO_DEV=1

# Copy only the configuration files first (docker-compose should run from root folder)
COPY pyproject.toml uv.lock ./

# Install dependencies without copying the whole source code yet
# This way, if you change a line of code, Docker doesn't re-install your packages.
RUN uv sync --frozen --no-install-project

# Now copy the actual source code
COPY backend ./backend

# Final sync to install the project itself
RUN uv sync --frozen

# Place the virtualenv on the path so we don't have to type 'uv run'
ENV PATH="/app/.venv/bin:$PATH"

# Run the FastAPI server
CMD ["uvicorn", "backend.src.backend.main:app", "--host", "0.0.0.0", "--port", "8000"]