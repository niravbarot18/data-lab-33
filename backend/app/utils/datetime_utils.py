from datetime import datetime, date, time, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import List, Tuple
from dateutil import parser

LONDON_TZ = ZoneInfo("Europe/London")
UTC = timezone.utc


def parse_to_aware_utc(dt_val: str | datetime) -> datetime:
    """
    Parses an ISO string or datetime object to a timezone-aware UTC datetime.
    Raises ValueError if naive and without timezone information.
    """
    if isinstance(dt_val, datetime):
        if dt_val.tzinfo is None:
            raise ValueError(f"Datetime {dt_val} is naive; timezone is required.")
        return dt_val.astimezone(UTC)
    
    parsed = parser.isoparse(dt_val)
    if parsed.tzinfo is None:
        raise ValueError(f"Timestamp string '{dt_val}' is naive; explicit timezone offset is required.")
    return parsed.astimezone(UTC)


def get_delivery_date_for_decision(decision_date: date) -> date:
    """
    Default MVP assumption: Delivery date is the calendar day after the decision date.
    """
    return decision_date + timedelta(days=1)


def parse_cutoff_to_utc(decision_date: date, cutoff_time_str: str, tz_name: str = "Europe/London") -> datetime:
    """
    Converts a local decision date and cutoff time string (HH:MM) in the given timezone (default Europe/London)
    to a timezone-aware UTC datetime.
    """
    tz = ZoneInfo(tz_name)
    parts = cutoff_time_str.strip().split(":")
    if len(parts) != 2:
        raise ValueError(f"Invalid cutoff format: '{cutoff_time_str}', expected 'HH:MM'")
    hour, minute = int(parts[0]), int(parts[1])
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        raise ValueError(f"Cutoff time '{cutoff_time_str}' out of range (00:00 - 23:59)")

    local_dt = datetime.combine(decision_date, time(hour, minute), tzinfo=tz)
    return local_dt.astimezone(UTC)


def generate_expected_delivery_periods(delivery_date: date, tz_name: str = "Europe/London") -> List[datetime]:
    """
    Builds the expected list of half-hourly delivery period starts for the delivery date in the given timezone,
    normalized to UTC.
    Derives the count dynamically based on the timezone boundaries (typically 48 periods, 46 or 50 on clock changes).
    """
    tz = ZoneInfo(tz_name)
    start_local = datetime.combine(delivery_date, time(0, 0), tzinfo=tz)
    next_day = delivery_date + timedelta(days=1)
    end_local = datetime.combine(next_day, time(0, 0), tzinfo=tz)

    start_utc = start_local.astimezone(UTC)
    end_utc = end_local.astimezone(UTC)

    periods: List[datetime] = []
    curr = start_utc
    while curr < end_utc:
        periods.append(curr)
        curr += timedelta(minutes=30)

    return periods


def format_iso_utc(dt: datetime) -> str:
    """
    Formats a datetime object to an ISO 8601 UTC string ending in 'Z'.
    """
    dt_utc = dt.astimezone(UTC)
    return dt_utc.strftime("%Y-%m-%dT%H:%M:%SZ")
