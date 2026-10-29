import logging
from datetime import datetime, timedelta, timezone
from threading import Lock
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.constants import MAX_REVIEWS
from app.models import AiReviewUsage

logger = logging.getLogger(__name__)

_limiter_lock = Lock()


def _now_utc(override: Optional[datetime] = None) -> datetime:
    if override is not None:
        return override if override.tzinfo else override.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


def _ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _get_or_create_usage(db: Session, user_id: int, now: datetime) -> AiReviewUsage:
    """Fetch usage row with row-level locking (FOR UPDATE) or create a fresh row atomically."""
    bind = db.get_bind()
    dialect_name = bind.dialect.name if bind else ""

    if dialect_name == "postgresql":
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        stmt = (
            pg_insert(AiReviewUsage)
            .values(
                user_id=user_id,
                window_start=now,
                count=0,
                blocked_attempts=0,
                penalty_until=None,
                daily_count=0,
                daily_window_start=now,
                updated_at=now,
            )
            .on_conflict_do_nothing(index_elements=["user_id"])
        )
        db.execute(stmt)
    elif dialect_name == "sqlite":
        from sqlalchemy.dialects.sqlite import insert as sqlite_insert
        stmt = (
            sqlite_insert(AiReviewUsage)
            .values(
                user_id=user_id,
                window_start=now,
                count=0,
                blocked_attempts=0,
                penalty_until=None,
                daily_count=0,
                daily_window_start=now,
                updated_at=now,
            )
            .on_conflict_do_nothing(index_elements=["user_id"])
        )
        db.execute(stmt)
    else:
        existing = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == user_id).first()
        if existing is None:
            usage = AiReviewUsage(
                user_id=user_id,
                window_start=now,
                count=0,
                blocked_attempts=0,
                penalty_until=None,
                daily_count=0,
                daily_window_start=now,
                updated_at=now,
            )
            db.add(usage)
            db.flush()

    usage = (
        db.query(AiReviewUsage)
        .filter(AiReviewUsage.user_id == user_id)
        .with_for_update()
        .first()
    )
    return usage


def _format_time_left(total_seconds: int) -> str:
    if total_seconds >= 86400:
        return "1 day"
    hours = max(1, (total_seconds + 3599) // 3600)
    if hours >= 24:
        return "1 day"
    if hours > 1:
        return f"{hours} hours"
    minutes = max(1, (total_seconds + 59) // 60)
    return f"{minutes} minute{'s' if minutes != 1 else ''}"


def check_and_consume_ai_review(
    db: Session,
    user_id: int,
    now_override: Optional[datetime] = None,
) -> dict:
    """
    Atomic check-and-consume for AI Review with window limits, daily quota, and spam penalty.
    Raises HTTPException(429) if blocked; otherwise increments count and commits transaction.
    """
    with _limiter_lock:
        return _check_and_consume_unlocked(db, user_id, now_override)


def _check_and_consume_unlocked(
    db: Session,
    user_id: int,
    now_override: Optional[datetime] = None,
) -> dict:
    """
    Atomic check-and-consume for AI Review with window limits, daily quota, and spam penalty.
    Raises HTTPException(429) if blocked; otherwise increments count and commits transaction.
    """
    now = _now_utc(now_override)
    max_per_window = getattr(settings, "max_reviews_per_window", None) or MAX_REVIEWS
    cooldown_seconds = settings.cooldown_seconds
    spam_threshold = settings.spam_threshold
    spam_cooldown_seconds = settings.spam_cooldown_seconds
    max_daily = settings.max_reviews_per_day

    usage = _get_or_create_usage(db, user_id, now)

    daily_window_start = _ensure_utc(usage.daily_window_start) or now
    penalty_until = _ensure_utc(usage.penalty_until)
    window_start = _ensure_utc(usage.window_start) or now

    if now >= daily_window_start + timedelta(hours=24):
        usage.daily_window_start = now
        daily_window_start = now
        usage.daily_count = 0

    if penalty_until is not None:
        if now < penalty_until:
            usage.blocked_attempts += 1
            usage.updated_at = now
            db.commit()
            retry_after = max(1, int((penalty_until - now).total_seconds()))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "rate_limited",
                    "message": f"Too many attempts. Please back in {_format_time_left(retry_after)}.",
                    "retry_after_seconds": retry_after,
                    "locked_until": penalty_until.isoformat(),
                    "remaining": 0,
                    "remaining_uses": 0,
                    "is_penalty_active": True,
                },
                headers={"Retry-After": str(retry_after)},
            )
        else:
            usage.penalty_until = None
            usage.blocked_attempts = 0
            usage.count = 0
            usage.window_start = now
            window_start = now

    cooldown_end = window_start + timedelta(seconds=cooldown_seconds)
    if now >= cooldown_end:
        usage.count = 0
        usage.blocked_attempts = 0
        usage.window_start = now
        window_start = now
        cooldown_end = window_start + timedelta(seconds=cooldown_seconds)

    if usage.count >= max_per_window:
        usage.blocked_attempts += 1
        usage.updated_at = now

        if usage.blocked_attempts >= spam_threshold:
            remaining_sec = max(1, int((cooldown_end - now).total_seconds()))
            penalty_dur = max(spam_cooldown_seconds, remaining_sec)
            usage.penalty_until = now + timedelta(seconds=penalty_dur)
            retry_after = penalty_dur
            logger.warning(
                "Spam penalty triggered for user_id=%s: %d blocked attempts. Penalty active for %ds.",
                user_id,
                usage.blocked_attempts,
                penalty_dur,
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "rate_limited",
                    "message": f"Too many attempts. Please back in {_format_time_left(retry_after)}.",
                    "retry_after_seconds": retry_after,
                    "locked_until": usage.penalty_until.isoformat(),
                    "remaining": 0,
                    "remaining_uses": 0,
                    "is_penalty_active": True,
                },
                headers={"Retry-After": str(retry_after)},
            )
        else:
            retry_after = max(1, int((cooldown_end - now).total_seconds()))
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "error": "rate_limited",
                    "message": f"You hit {max_per_window} trials, please come back later.",
                    "retry_after_seconds": retry_after,
                    "locked_until": cooldown_end.isoformat(),
                    "remaining": 0,
                    "remaining_uses": 0,
                    "is_penalty_active": False,
                },
                headers={"Retry-After": str(retry_after)},
            )

    if usage.daily_count >= max_daily:
        daily_reset = daily_window_start + timedelta(hours=24)
        retry_after = max(1, int((daily_reset - now).total_seconds()))
        usage.blocked_attempts += 1
        usage.updated_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "rate_limited",
                "message": f"Daily limit reached. Please back in {_format_time_left(retry_after)}.",
                "retry_after_seconds": retry_after,
                "locked_until": daily_reset.isoformat(),
                "remaining": 0,
                "remaining_uses": 0,
                "daily_remaining": 0,
                "is_daily_limit": True,
            },
            headers={"Retry-After": str(retry_after)},
        )

    usage.count += 1
    if usage.count == 1:
        usage.window_start = now
    elif usage.count == max_per_window:
        usage.window_start = now

    usage.daily_count += 1
    usage.updated_at = now
    db.commit()

    remaining_window = max(0, max_per_window - usage.count)
    daily_remaining = max(0, max_daily - usage.daily_count)
    retry_after_seconds = 0
    locked_until = None
    if remaining_window == 0:
        w_start = _ensure_utc(usage.window_start) or now
        new_cooldown_end = w_start + timedelta(seconds=cooldown_seconds)
        retry_after_seconds = max(1, int((new_cooldown_end - now).total_seconds()))
        locked_until = new_cooldown_end.isoformat()

    return {
        "remaining": remaining_window,
        "remaining_uses": remaining_window,
        "retry_after_seconds": retry_after_seconds,
        "locked_until": locked_until,
        "daily_remaining": daily_remaining,
        "max_per_window": max_per_window,
        "max_daily": max_daily,
        "consumed_at": now,
    }


def revert_ai_review_consumption(
    db: Session,
    user_id: int,
    consumed_at: Optional[datetime] = None,
) -> bool:
    """
    Revert consumption if the LLM provider fails due to a server error.
    - Guarantees count and daily_count never drop below 0.
    - Does not revert if the window has already reset since the use was consumed.
    """
    with _limiter_lock:
        try:
            now = _now_utc()
            cooldown_seconds = settings.cooldown_seconds
            usage = (
                db.query(AiReviewUsage)
                .filter(AiReviewUsage.user_id == user_id)
                .with_for_update()
                .first()
            )
            if usage is None:
                return False

            window_start = _ensure_utc(usage.window_start)
            daily_window_start = _ensure_utc(usage.daily_window_start)

            if window_start and now >= window_start + timedelta(seconds=cooldown_seconds):
                logger.info("Revert skipped: 5-minute cooldown window already reset for user_id=%s", user_id)
                return False

            if daily_window_start and now >= daily_window_start + timedelta(hours=24):
                logger.info("Revert skipped: daily 24h window already reset for user_id=%s", user_id)
                return False

            if consumed_at is not None:
                consumed_utc = _ensure_utc(consumed_at)
                if window_start and consumed_utc < window_start:
                    logger.info("Revert skipped: consumed_at is older than current window start for user_id=%s", user_id)
                    return False

            usage.count = max(0, usage.count - 1)
            usage.daily_count = max(0, usage.daily_count - 1)
            usage.updated_at = now
            db.commit()
            return True
        except Exception as exc:
            db.rollback()
            logger.error("Could not revert AI review count for user_id=%s: %s", user_id, exc)
            return False


def get_ai_review_status(
    db: Session,
    user_id: int,
    now_override: Optional[datetime] = None,
) -> dict:
    """
    Query current rate limit and countdown status without incrementing counters or blocked attempts.
    """
    now = _now_utc(now_override)
    max_per_window = getattr(settings, "max_reviews_per_window", None) or MAX_REVIEWS
    cooldown_seconds = settings.cooldown_seconds
    max_daily = settings.max_reviews_per_day

    usage = db.query(AiReviewUsage).filter(AiReviewUsage.user_id == user_id).first()
    if usage is None:
        return {
            "remaining": max_per_window,
            "remaining_uses": max_per_window,
            "retry_after_seconds": 0,
            "locked_until": None,
            "daily_remaining": max_daily,
            "is_penalty_active": False,
            "max_per_window": max_per_window,
            "max_daily": max_daily,
        }

    daily_window_start = _ensure_utc(usage.daily_window_start) or now
    penalty_until = _ensure_utc(usage.penalty_until)
    window_start = _ensure_utc(usage.window_start) or now

    daily_count = usage.daily_count
    if now >= daily_window_start + timedelta(hours=24):
        daily_count = 0
    daily_remaining = max(0, max_daily - daily_count)

    if penalty_until is not None:
        if now < penalty_until:
            retry_after = max(1, int((penalty_until - now).total_seconds()))
            return {
                "remaining": 0,
                "remaining_uses": 0,
                "retry_after_seconds": retry_after,
                "locked_until": penalty_until.isoformat(),
                "daily_remaining": daily_remaining,
                "is_penalty_active": True,
                "is_daily_limit": False,
                "max_per_window": max_per_window,
                "max_daily": max_daily,
            }

    cooldown_end = window_start + timedelta(seconds=cooldown_seconds)
    if usage.count >= max_per_window and now < cooldown_end:
        retry_after = max(1, int((cooldown_end - now).total_seconds()))
        return {
            "remaining": 0,
            "remaining_uses": 0,
            "retry_after_seconds": retry_after,
            "locked_until": cooldown_end.isoformat(),
            "daily_remaining": daily_remaining,
            "is_penalty_active": False,
            "is_daily_limit": False,
            "max_per_window": max_per_window,
            "max_daily": max_daily,
        }

    if daily_count >= max_daily:
        daily_reset = daily_window_start + timedelta(hours=24)
        retry_after = max(1, int((daily_reset - now).total_seconds()))
        return {
            "remaining": 0,
            "remaining_uses": 0,
            "retry_after_seconds": retry_after,
            "locked_until": daily_reset.isoformat(),
            "daily_remaining": 0,
            "is_penalty_active": False,
            "is_daily_limit": True,
            "max_per_window": max_per_window,
            "max_daily": max_daily,
        }

    window_count = 0 if now >= cooldown_end or (penalty_until is not None and now >= penalty_until) else usage.count
    remaining = max(0, max_per_window - window_count)

    return {
        "remaining": remaining,
        "remaining_uses": remaining,
        "retry_after_seconds": 0,
        "locked_until": None,
        "daily_remaining": daily_remaining,
        "is_penalty_active": False,
        "is_daily_limit": False,
        "max_per_window": max_per_window,
        "max_daily": max_daily,
    }


def cleanup_inactive_usage_rows(db: Session, max_age_days: int = 30) -> int:
    """
    Delete ai_review_usage rows that have not been updated for max_age_days.
    Returns the number of deleted rows.
    """
    threshold = _now_utc() - timedelta(days=max_age_days)
    try:
        deleted = (
            db.query(AiReviewUsage)
            .filter(AiReviewUsage.updated_at < threshold)
            .delete(synchronize_session=False)
        )
        db.commit()
        if deleted > 0:
            logger.info("Cleaned up %d expired ai_review_usage rows older than %d days", deleted, max_age_days)
        return deleted
    except Exception as exc:
        db.rollback()
        logger.error("Failed to clean up expired ai_review_usage rows: %s", exc)
        return 0
