#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head
echo "Migrations complete."

echo "Starting FastAPI..."
exec fastapi run --workers ${WEB_CONCURRENCY:-4} src/main.py
