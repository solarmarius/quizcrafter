#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head
echo "Migrations complete."

echo "Starting FastAPI with Gunicorn..."
exec gunicorn \
  -w "${WEB_CONCURRENCY:-2}" \
  -k uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --timeout 600 \
  --keep-alive 5 \
  --max-requests 1000 \
  --max-requests-jitter 100 \
  --worker-tmp-dir /dev/shm \
  src.main:app
