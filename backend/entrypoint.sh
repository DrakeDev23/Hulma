#!/bin/sh
set -e

# Run migrations only if RUN_MIGRATIONS_ON_START=true.
# On Render, migrations should be run via Pre-Deploy Command (recommended).
if [ "$RUN_MIGRATIONS_ON_START" = "true" ]; then
    echo "Running database migrations (Alembic)..."
    python -m alembic upgrade head
fi

exec "$@"
