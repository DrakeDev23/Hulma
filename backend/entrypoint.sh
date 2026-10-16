#!/bin/sh
set -e

if [ "$RUN_MIGRATIONS_ON_START" = "true" ]; then
    echo "Running database migrations (Alembic)..."
    python -m alembic upgrade head
fi

exec "$@"
