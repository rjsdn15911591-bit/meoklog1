from datetime import datetime, date, timedelta, timezone

try:
    from zoneinfo import ZoneInfo
    KST = ZoneInfo("Asia/Seoul")
except Exception:
    # Windows without tzdata: fallback to UTC+9
    KST = timezone(timedelta(hours=9))


def get_log_date(uploaded_at: datetime) -> date:
    """
    업로드 시각을 04:00 기준 날짜로 변환
    2026-05-25 02:30 KST → 2026-05-24
    2026-05-25 05:00 KST → 2026-05-25
    naive datetime은 UTC로 간주 (DB 저장 규칙과 일치)
    """
    if uploaded_at.tzinfo is None:
        uploaded_at = uploaded_at.replace(tzinfo=timezone.utc)
    kst_time = uploaded_at.astimezone(KST)
    if kst_time.hour < 4:
        return (kst_time - timedelta(days=1)).date()
    return kst_time.date()


def get_day_range(log_date: date) -> tuple[datetime, datetime]:
    """log_date에 해당하는 실제 시간 범위 반환"""
    start = datetime(log_date.year, log_date.month, log_date.day, 4, 0, 0, tzinfo=KST)
    end = start + timedelta(days=1) - timedelta(seconds=1)
    return start, end
