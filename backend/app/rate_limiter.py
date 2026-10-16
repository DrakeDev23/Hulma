import time
from collections import defaultdict
from threading import Lock
from typing import NamedTuple

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


class RateLimitRule(NamedTuple):
    limit: int
    window_seconds: int

ROUTE_LIMITS: dict[str, RateLimitRule] = {
    "/api/portfolio/review": RateLimitRule(limit=30, window_seconds=60),
    "/api/portfolio/draft-check": RateLimitRule(limit=20, window_seconds=60),
    "/api/portfolio/images/upload": RateLimitRule(limit=20, window_seconds=60),
}

DEFAULT_API_LIMIT = RateLimitRule(limit=120, window_seconds=60)


class InMemoryRateLimiter:
    def __init__(self):
        self._history: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()
        self._last_cleanup = time.time()

    def _get_key(self, request: Request, rule_name: str) -> str:
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer ") and len(auth) > 20:
            client_id = auth[-16:]
        else:
            client_id = request.client.host if request.client else "unknown"
        return f"{rule_name}:{client_id}"

    def check_rate_limit(self, request: Request) -> tuple[bool, int]:
        path = request.url.path.rstrip("/")
        rule = ROUTE_LIMITS.get(path)

        if rule is None and path.startswith("/api"):
            rule = DEFAULT_API_LIMIT

        if rule is None:
            return True, 0

        key = self._get_key(request, path if path in ROUTE_LIMITS else "api_general")
        now = time.time()
        window_start = now - rule.window_seconds

        with self._lock:
            if now - self._last_cleanup > 300:
                self._cleanup(now)
                self._last_cleanup = now

            timestamps = self._history[key]
            valid_timestamps = [t for t in timestamps if t > window_start]
            self._history[key] = valid_timestamps

            if len(valid_timestamps) >= rule.limit:
                retry_after = int(valid_timestamps[0] + rule.window_seconds - now) + 1
                return False, max(1, retry_after)

            self._history[key].append(now)
            return True, 0

    def _cleanup(self, now: float) -> None:
        to_delete = []
        for key, timestamps in self._history.items():
            valid = [t for t in timestamps if t > now - 300]
            if valid:
                self._history[key] = valid
            else:
                to_delete.append(key)
        for k in to_delete:
            del self._history[k]

    def clear(self) -> None:
        with self._lock:
            self._history.clear()


limiter = InMemoryRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ("/", "/health", "/docs", "/redoc", "/openapi.json"):
            return await call_next(request)

        allowed, retry_after = limiter.check_rate_limit(request)
        if not allowed:
            return JSONResponse(
                status_code=429,
                content={
                    "detail": "Too many requests. Please slow down and try again later.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)
