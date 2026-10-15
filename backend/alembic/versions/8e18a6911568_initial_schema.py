"""initial_schema

Revision ID: 8e18a6911568
Revises:
Create Date: 2026-10-15 23:21:31.236610

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8e18a6911568'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _check_duplicates(conn, table: str, column: str) -> None:
    """Raise RuntimeError if duplicate non-null values exist in a column."""
    stmt = sa.text(
        f"SELECT {column}, COUNT(*) as cnt FROM {table} "
        f"WHERE {column} IS NOT NULL "
        f"GROUP BY {column} HAVING COUNT(*) > 1;"
    )
    dupes = conn.execute(stmt).fetchall()
    if dupes:
        sample = [f"'{row[0]}' (count: {row[1]})" for row in dupes[:5]]
        raise RuntimeError(
            f"Cannot create unique index on {table}.{column}: "
            f"found {len(dupes)} duplicate value(s): {', '.join(sample)}. "
            f"Manual deduplication is required before applying this migration."
        )


def _has_unique_index_or_constraint(indexes, constraints, col_names: list[str]) -> bool:
    """Return True if an existing unique index or unique constraint covers the exact columns."""
    for idx in indexes:
        if idx.get("column_names") == col_names and idx.get("unique") is True:
            return True
    for uc in constraints:
        if uc.get("column_names") == col_names:
            return True
    return False


def _has_index(indexes, col_names: list[str]) -> bool:
    """Return True if an index covers the exact columns."""
    for idx in indexes:
        if idx.get("column_names") == col_names:
            return True
    return False


def _validate_column_type(table_name: str, col_name: str, col_info: dict, expected_category: str, expected_nullable: bool) -> None:
    """Validate that an existing column has a compatible data type and nullability."""
    col_type = col_info["type"].__class__.__name__.upper()
    col_nullable = col_info["nullable"]

    categories = {
        "int": ("INTEGER", "BIGINT", "SMALLINT", "INT"),
        "str": ("VARCHAR", "TEXT", "STRING", "CHAR"),
        "bool": ("BOOLEAN", "BOOL"),
        "datetime": ("TIMESTAMP", "DATETIME"),
        "json": ("JSON", "JSONB"),
    }

    valid_types = categories.get(expected_category, ())
    if not any(vt in col_type for vt in valid_types):
        raise RuntimeError(
            f"Incompatible column type for {table_name}.{col_name}: found {col_type}, "
            f"expected type category '{expected_category}' ({valid_types})."
        )

    if expected_nullable is False and col_nullable is True:
        raise RuntimeError(
            f"Incompatible nullability for {table_name}.{col_name}: column is NULLABLE in database, "
            f"but model requires NOT NULL."
        )

    if expected_nullable is True and col_nullable is False:
        raise RuntimeError(
            f"Incompatible nullability for {table_name}.{col_name}: column is NOT NULL in database, "
            f"but model expects NULLABLE (inserts with null values will fail)."
        )


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = set(insp.get_table_names())

    # =========================================================================
    # 1. Users Table
    # =========================================================================
    if "users" not in tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("clerk_id", sa.String(length=255), nullable=False),
            sa.Column("username", sa.String(length=120), nullable=True),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("avatar_url", sa.String(length=500), nullable=True),
            sa.Column("settings", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_users_id", "users", ["id"], unique=False)
        op.create_index("ix_users_clerk_id", "users", ["clerk_id"], unique=True)
        op.create_index("ix_users_email", "users", ["email"], unique=True)
        op.create_index("ix_users_username", "users", ["username"], unique=True)
    else:
        # Existing users table: inspect and safely baseline
        user_cols = {c["name"]: c for c in insp.get_columns("users")}
        user_rows = conn.execute(sa.text("SELECT COUNT(*) FROM users;")).scalar() or 0

        # Check required columns that cannot have arbitrary defaults on populated tables
        if "id" not in user_cols:
            raise RuntimeError("Existing 'users' table is missing primary key column 'id'. Incompatible schema.")

        if "clerk_id" not in user_cols:
            if user_rows > 0:
                raise RuntimeError(
                    f"Existing 'users' table has {user_rows} rows but is missing required column 'clerk_id'. "
                    "Cannot safely add non-nullable clerk_id without user account mapping. "
                    "Manual schema remediation required."
                )
            conn.execute(sa.text("ALTER TABLE users ADD COLUMN clerk_id VARCHAR(255) NOT NULL;"))

        if "email" not in user_cols:
            if user_rows > 0:
                raise RuntimeError(
                    f"Existing 'users' table has {user_rows} rows but is missing required column 'email'. "
                    "Cannot safely add non-nullable email without user data. "
                    "Manual schema remediation required."
                )
            conn.execute(sa.text("ALTER TABLE users ADD COLUMN email VARCHAR(255) NOT NULL;"))

        # Add optional or safe defaulted columns with JSON type (not jsonb)
        if "username" not in user_cols:
            conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(120);"))
        if "avatar_url" not in user_cols:
            conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);"))
        if "settings" not in user_cols:
            conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSON NOT NULL DEFAULT '{}'::json;"))
        if "is_active" not in user_cols:
            conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;"))
        if "created_at" not in user_cols:
            conn.execute(sa.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))

        # Clear inspector cache and re-fetch columns to validate types and nullability against models.py
        insp.clear_cache()
        user_cols = {c["name"]: c for c in insp.get_columns("users")}
        expected_user_cols = [
            ("id", "int", False),
            ("clerk_id", "str", False),
            ("username", "str", True),
            ("email", "str", False),
            ("avatar_url", "str", True),
            ("settings", "json", False),
            ("is_active", "bool", False),
            ("created_at", "datetime", False),
        ]
        for col_name, cat, nullable in expected_user_cols:
            if col_name not in user_cols:
                raise RuntimeError(
                    f"Column '{col_name}' is missing from table 'users' after migration steps. "
                    "Schema validation failed."
                )
            _validate_column_type("users", col_name, user_cols[col_name], cat, nullable)

        # Check for duplicates before enforcing unique constraints
        _check_duplicates(conn, "users", "clerk_id")
        _check_duplicates(conn, "users", "email")
        _check_duplicates(conn, "users", "username")

        # Preserve existing indexes and unique constraints; avoid duplicates
        existing_user_indexes = insp.get_indexes("users")
        existing_user_ucs = insp.get_unique_constraints("users")

        if not _has_index(existing_user_indexes, ["id"]):
            conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_users_id ON users (id);"))

        if not _has_unique_index_or_constraint(existing_user_indexes, existing_user_ucs, ["clerk_id"]):
            conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_clerk_id ON users (clerk_id);"))

        if not _has_unique_index_or_constraint(existing_user_indexes, existing_user_ucs, ["email"]):
            conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);"))

        if not _has_unique_index_or_constraint(existing_user_indexes, existing_user_ucs, ["username"]):
            conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username);"))

    # =========================================================================
    # 2. Portfolios Table
    # =========================================================================
    if "portfolios" not in tables:
        op.create_table(
            "portfolios",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False, server_default="My Portfolio"),
            sa.Column("summary", sa.Text(), nullable=True),
            sa.Column("sections", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
            sa.Column("projects", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
            sa.Column("views", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("completion", sa.Integer(), nullable=False, server_default=sa.text("0")),
            sa.Column("slug", sa.String(length=32), nullable=True),
            sa.Column("review", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index("ix_portfolios_id", "portfolios", ["id"], unique=False)
        op.create_index("ix_portfolios_user_id", "portfolios", ["user_id"], unique=False)
        op.create_index("ix_portfolios_slug", "portfolios", ["slug"], unique=True)
        op.create_index("idx_portfolios_user_updated", "portfolios", ["user_id", "updated_at"], unique=False)
    else:
        # Existing portfolios table: inspect and safely baseline
        port_cols = {c["name"]: c for c in insp.get_columns("portfolios")}
        port_rows = conn.execute(sa.text("SELECT COUNT(*) FROM portfolios;")).scalar() or 0

        if "id" not in port_cols:
            raise RuntimeError("Existing 'portfolios' table is missing primary key column 'id'. Incompatible schema.")

        if "user_id" not in port_cols:
            if port_rows > 0:
                raise RuntimeError(
                    f"Existing 'portfolios' table has {port_rows} rows but is missing required column 'user_id'. "
                    "Cannot assign portfolios to users automatically. Manual schema remediation required."
                )
            conn.execute(sa.text("ALTER TABLE portfolios ADD COLUMN user_id INTEGER NOT NULL;"))

        # Explicit Foreign Key validation: must reference users.id with ON DELETE CASCADE
        existing_fks = insp.get_foreign_keys("portfolios")
        user_fk = next((fk for fk in existing_fks if fk.get("constrained_columns") == ["user_id"]), None)

        if user_fk is None:
            # Check for orphan rows before attaching foreign key
            orphan_count = conn.execute(
                sa.text("SELECT COUNT(*) FROM portfolios WHERE user_id NOT IN (SELECT id FROM users);")
            ).scalar() or 0
            if orphan_count > 0:
                raise RuntimeError(
                    f"Cannot create foreign key on 'portfolios.user_id': found {orphan_count} orphan portfolio(s) "
                    "referencing non-existent users. Schema validation failed."
                )
            conn.execute(
                sa.text(
                    "ALTER TABLE portfolios ADD CONSTRAINT portfolios_user_id_fkey "
                    "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;"
                )
            )
        else:
            referred_table = user_fk.get("referred_table")
            referred_cols = user_fk.get("referred_columns")
            ondelete = (user_fk.get("options") or {}).get("ondelete", "")

            if referred_table != "users" or referred_cols != ["id"]:
                raise RuntimeError(
                    f"Foreign key '{user_fk.get('name')}' on 'portfolios.user_id' references "
                    f"'{referred_table}.{referred_cols}', expected 'users.id'. Incompatible schema."
                )
            if not ondelete or ondelete.upper() != "CASCADE":
                raise RuntimeError(
                    f"Foreign key '{user_fk.get('name')}' on 'portfolios.user_id' has ON DELETE '{ondelete or 'NO ACTION'}', "
                    "expected 'CASCADE'. Schema validation failed."
                )

        # Add any missing columns with exact models.py definitions and JSON (not jsonb)
        if "title" not in port_cols:
            conn.execute(sa.text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS title VARCHAR(200) NOT NULL DEFAULT 'My Portfolio';"))
        if "summary" not in port_cols:
            conn.execute(sa.text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS summary TEXT;"))
        if "sections" not in port_cols:
            conn.execute(sa.text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS sections JSON NOT NULL DEFAULT '{}'::json;"))
        if "projects" not in port_cols:
            conn.execute(sa.text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS projects JSON NOT NULL DEFAULT '[]'::json;"))
        if "views" not in port_cols:
            conn.execute(sa.text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;"))
        if "completion" not in port_cols:
            conn.execute(sa.text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS completion INTEGER NOT NULL DEFAULT 0;"))
        if "slug" not in port_cols:
            conn.execute(sa.text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS slug VARCHAR(32);"))
        if "review" not in port_cols:
            conn.execute(sa.text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS review JSON;"))
        if "created_at" not in port_cols:
            conn.execute(sa.text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))
        if "updated_at" not in port_cols:
            conn.execute(sa.text("ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();"))

        # Clear inspector cache and re-fetch columns to validate types and nullability against models.py
        insp.clear_cache()
        port_cols = {c["name"]: c for c in insp.get_columns("portfolios")}
        expected_port_cols = [
            ("id", "int", False),
            ("user_id", "int", False),
            ("title", "str", False),
            ("summary", "str", True),
            ("sections", "json", False),
            ("projects", "json", False),
            ("views", "int", False),
            ("completion", "int", False),
            ("slug", "str", True),
            ("review", "json", True),
            ("created_at", "datetime", False),
            ("updated_at", "datetime", False),
        ]
        for col_name, cat, nullable in expected_port_cols:
            if col_name not in port_cols:
                raise RuntimeError(
                    f"Column '{col_name}' is missing from table 'portfolios' after migration steps. "
                    "Schema validation failed."
                )
            _validate_column_type("portfolios", col_name, port_cols[col_name], cat, nullable)

        # Check for slug duplicates before creating unique index
        _check_duplicates(conn, "portfolios", "slug")

        # Preserve existing indexes and constraints; avoid duplicates
        existing_port_indexes = insp.get_indexes("portfolios")
        existing_port_ucs = insp.get_unique_constraints("portfolios")

        if not _has_index(existing_port_indexes, ["id"]):
            conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_portfolios_id ON portfolios (id);"))

        if not _has_index(existing_port_indexes, ["user_id"]):
            conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_portfolios_user_id ON portfolios (user_id);"))

        if not _has_unique_index_or_constraint(existing_port_indexes, existing_port_ucs, ["slug"]):
            conn.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_portfolios_slug ON portfolios (slug);"))

        # Index matching models.py: Index("idx_portfolios_user_updated", "user_id", "updated_at")
        if not _has_index(existing_port_indexes, ["user_id", "updated_at"]):
            conn.execute(sa.text("CREATE INDEX IF NOT EXISTS idx_portfolios_user_updated ON portfolios (user_id, updated_at);"))


def downgrade() -> None:
    # Intentionally disabled in production to protect existing user data.
    raise NotImplementedError(
        "Automatic downgrade is disabled in production to prevent accidental data loss. "
        "Dropping initial schema tables ('users', 'portfolios') would permanently destroy all user records. "
        "For schema rollback or recovery, restore from a verified database snapshot or apply manual audited SQL."
    )
