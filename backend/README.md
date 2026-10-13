# Hulma Backend

This backend uses FastAPI with PostgreSQL and Clerk-based authentication.

## 1) PostgreSQL with psql

Create the database and role from the CLI:

```bash
psql -U postgres
```

Then run:

```sql
CREATE DATABASE hulma;
CREATE USER hulmauser WITH ENCRYPTED PASSWORD 'change_me_now';
ALTER ROLE hulmauser WITH LOGIN;
GRANT ALL PRIVILEGES ON DATABASE hulma TO hulmauser;
\q
```

Or use the bundled script:

```bash
psql -U postgres -f database/init.sql
```

## 2) Environment variables

Copy the example file:

```bash
cp .env.example .env
```

Then update values:

- `DATABASE_URL`
- `SECRET_KEY`
- `CLERK_ISSUER`
- `CLERK_JWKS_URL`
- `CLERK_AUDIENCE`

## 3) Install Python dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 4) Run the FastAPI service

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 5) Verify the service

```bash
curl http://localhost:8000/health
```

## 6) Clerk auth

Use the Clerk issuer and JWKS URL from your Clerk dashboard. The backend validates the JWT before allowing access to protected endpoints.
