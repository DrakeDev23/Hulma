CREATE DATABASE hulma;

CREATE USER hulmauser WITH ENCRYPTED PASSWORD 'change_me_now';
ALTER ROLE hulmauser WITH LOGIN;
GRANT CONNECT ON DATABASE hulma TO hulmauser;

\c hulma;

GRANT USAGE ON SCHEMA public TO hulmauser;
GRANT CREATE ON SCHEMA public TO hulmauser;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    clerk_id VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(120) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users (clerk_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
