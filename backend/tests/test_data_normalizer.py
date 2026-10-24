from datetime import datetime, timezone
import pytest

from app.services.data_normalizer import (
    normalize_actuals,
    normalize_forecasts,
    NormalizedActual,
    NormalizedForecast
)

UTC = timezone.utc


def test_normalize_actuals_filters_wind_and_parses():
    raw_records = [
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-16T00:30:00Z",
            "startTime": "2026-01-16T00:00:00Z",
            "settlementDate": "2026-01-16",
            "settlementPeriod": 1,
            "fuelType": "WIND",
            "generation": 7500
        },
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-16T00:30:00Z",
            "startTime": "2026-01-16T00:00:00Z",
            "settlementDate": "2026-01-16",
            "settlementPeriod": 1,
            "fuelType": "NUCLEAR",
            "generation": 4000
        },
        {
            "dataset": "FUELHH",
            "publishTime": "2026-01-16T01:00:00Z",
            "startTime": "2026-01-16T00:30:00Z",
            "settlementDate": "2026-01-16",
            "settlementPeriod": 2,
            "fuelType": "WIND",
            "generation": "8120.5"
        }
    ]

    actuals = normalize_actuals(raw_records)
    assert len(actuals) == 2
    assert actuals[0].generation_mw == 7500.0
    assert actuals[0].delivery_start == datetime(2026, 1, 16, 0, 0, tzinfo=UTC)
    assert actuals[1].generation_mw == 8120.5
    assert actuals[1].delivery_start == datetime(2026, 1, 16, 0, 30, tzinfo=UTC)


def test_normalize_actuals_ignores_malformed_and_missing_values():
    raw_records = [
        {"fuelType": "WIND", "startTime": "invalid-date", "generation": 100},
        {"fuelType": "WIND", "startTime": "2026-01-16T00:00:00Z", "generation": "not-a-number"},
        {"fuelType": "WIND", "startTime": "2026-01-16T00:00:00Z", "generation": None},
        {"fuelType": "WIND", "startTime": None, "generation": 500},
    ]
    actuals = normalize_actuals(raw_records)
    assert len(actuals) == 0


def test_normalize_actuals_deduplication():
    raw_records = [
        {"fuelType": "WIND", "startTime": "2026-01-16T00:00:00Z", "generation": 7000, "settlementPeriod": 1},
        {"fuelType": "WIND", "startTime": "2026-01-16T00:00:00Z", "generation": 7200, "settlementPeriod": 2},
    ]
    actuals = normalize_actuals(raw_records)
    assert len(actuals) == 1
    # Kept higher settlementPeriod
    assert actuals[0].generation_mw == 7200.0


def test_normalize_forecasts():
    raw_records = [
        {
            "dataset": "WINDFOR",
            "startTime": "2026-01-16T00:00:00Z",
            "publishTime": "2026-01-15T09:00:00Z",
            "generation": 6800
        },
        {
            "dataset": "WINDFOR",
            "startTime": "2026-01-16T00:00:00Z",
            "publishTime": "2026-01-15T09:30:00Z",
            "generation": 7100
        },
        {
            # Duplicate identical timestamps
            "dataset": "WINDFOR",
            "startTime": "2026-01-16T00:00:00Z",
            "publishTime": "2026-01-15T09:30:00Z",
            "generation": 7150
        }
    ]

    forecasts = normalize_forecasts(raw_records)
    assert len(forecasts) == 2
    assert forecasts[0].generation_mw == 6800.0
    assert forecasts[1].generation_mw == 7150.0  # deduplicated to latest
