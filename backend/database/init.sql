CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(120) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url VARCHAR(500),
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS portfolios (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL DEFAULT 'My Portfolio',
    summary TEXT,
    sections JSONB NOT NULL DEFAULT '{}'::jsonb,
    projects JSONB NOT NULL DEFAULT '[]'::jsonb,
    views INTEGER NOT NULL DEFAULT 0,
    completion INTEGER NOT NULL DEFAULT 0,
    slug VARCHAR(32),
    review JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS ix_portfolios_slug ON portfolios (slug);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_updated ON portfolios (user_id, updated_at DESC);

ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS slug VARCHAR(32);
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS review JSONB;
ALTER TABLE portfolios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
