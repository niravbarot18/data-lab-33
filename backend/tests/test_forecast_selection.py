from datetime import datetime, timezone, timedelta
import pytest

from app.services.data_normalizer import NormalizedForecast
from app.services.forecast_service import select_forecasts_as_of

UTC = timezone.utc


def make_forecast(delivery_iso: str, publish_iso: str, gen: float) -> NormalizedForecast:
    return NormalizedForecast(
        delivery_start=datetime.fromisoformat(delivery_iso).replace(tzinfo=UTC),
        publish_time=datetime.fromisoformat(publish_iso).replace(tzinfo=UTC),
        generation_mw=gen,
        source_dataset="WINDFOR"
    )


def test_single_eligible_forecast():
    cutoff = datetime(2026, 1, 15, 9, 50, tzinfo=UTC)
    fc = make_forecast("2026-01-16T00:00:00", "2026-01-15T09:30:00", 7500.0)

    selected = select_forecasts_as_of([fc], cutoff)
    assert len(selected) == 1
    delivery_key = datetime(2026, 1, 16, 0, 0, tzinfo=UTC)
    assert selected[delivery_key].generation_mw == 7500.0


def test_multiple_vintages_latest_eligible_wins():
    cutoff = datetime(2026, 1, 15, 9, 50, tzinfo=UTC)
    # 3 vintages: 06:00 (old), 09:30 (latest eligible), 12:00 (ineligible, after cutoff)
    fc_early = make_forecast("2026-01-16T00:00:00", "2026-01-15T06:00:00", 7100.0)
    fc_cutoff = make_forecast("2026-01-16T00:00:00", "2026-01-15T09:30:00", 7450.0)
    fc_after = make_forecast("2026-01-16T00:00:00", "2026-01-15T12:00:00", 8200.0)

    selected = select_forecasts_as_of([fc_early, fc_cutoff, fc_after], cutoff)
    delivery_key = datetime(2026, 1, 16, 0, 0, tzinfo=UTC)
    assert selected[delivery_key].generation_mw == 7450.0
    assert selected[delivery_key].publish_time == datetime(2026, 1, 15, 9, 30, tzinfo=UTC)


def test_forecast_published_after_cutoff_is_excluded():
    cutoff = datetime(2026, 1, 15, 9, 50, tzinfo=UTC)
    fc_after = make_forecast("2026-01-16T00:00:00", "2026-01-15T09:50:01", 8000.0)

    selected = select_forecasts_as_of([fc_after], cutoff)
    assert len(selected) == 0


def test_forecast_published_exactly_at_cutoff_is_eligible():
    cutoff = datetime(2026, 1, 15, 9, 50, tzinfo=UTC)
    fc_exact = make_forecast("2026-01-16T00:00:00", "2026-01-15T09:50:00", 7800.0)

    selected = select_forecasts_as_of([fc_exact], cutoff)
    delivery_key = datetime(2026, 1, 16, 0, 0, tzinfo=UTC)
    assert len(selected) == 1
    assert selected[delivery_key].generation_mw == 7800.0


def test_no_forecast_before_cutoff():
    cutoff = datetime(2026, 1, 15, 9, 50, tzinfo=UTC)
    fc_later1 = make_forecast("2026-01-16T00:00:00", "2026-01-15T10:00:00", 7200.0)
    fc_later2 = make_forecast("2026-01-16T00:00:00", "2026-01-15T14:00:00", 7300.0)

    selected = select_forecasts_as_of([fc_later1, fc_later2], cutoff)
    delivery_key = datetime(2026, 1, 16, 0, 0, tzinfo=UTC)
    assert delivery_key not in selected


def test_multiple_delivery_periods_selected_independently():
    cutoff = datetime(2026, 1, 15, 9, 50, tzinfo=UTC)
    p1_early = make_forecast("2026-01-16T00:00:00", "2026-01-15T07:00:00", 6000.0)
    p1_late = make_forecast("2026-01-16T00:00:00", "2026-01-15T09:00:00", 6500.0)

    p2_early = make_forecast("2026-01-16T01:00:00", "2026-01-15T08:00:00", 5000.0)
    p2_after = make_forecast("2026-01-16T01:00:00", "2026-01-15T10:00:00", 5500.0)

    selected = select_forecasts_as_of([p1_early, p1_late, p2_early, p2_after], cutoff)
    p1_key = datetime(2026, 1, 16, 0, 0, tzinfo=UTC)
    p2_key = datetime(2026, 1, 16, 1, 0, tzinfo=UTC)

    assert selected[p1_key].generation_mw == 6500.0
    assert selected[p2_key].generation_mw == 5000.0


def test_duplicate_delivery_and_publish_resolves_deterministically():
    cutoff = datetime(2026, 1, 15, 9, 50, tzinfo=UTC)
    fc1 = make_forecast("2026-01-16T00:00:00", "2026-01-15T09:00:00", 6100.0)
    fc2 = make_forecast("2026-01-16T00:00:00", "2026-01-15T09:00:00", 6200.0)

    selected = select_forecasts_as_of([fc1, fc2], cutoff)
    delivery_key = datetime(2026, 1, 16, 0, 0, tzinfo=UTC)
    # deterministic tie-breaker selects higher generation value
    assert selected[delivery_key].generation_mw == 6200.0


def test_cutoff_change_updates_selected_vintage():
    early_cutoff = datetime(2026, 1, 15, 9, 50, tzinfo=UTC)
    late_cutoff = datetime(2026, 1, 15, 16, 00, tzinfo=UTC)

    fc_morning = make_forecast("2026-01-16T00:00:00", "2026-01-15T09:30:00", 7000.0)
    fc_afternoon = make_forecast("2026-01-16T00:00:00", "2026-01-15T15:30:00", 7800.0)

    forecasts = [fc_morning, fc_afternoon]
    p_key = datetime(2026, 1, 16, 0, 0, tzinfo=UTC)

    selected_early = select_forecasts_as_of(forecasts, early_cutoff)
    assert selected_early[p_key].generation_mw == 7000.0

    selected_late = select_forecasts_as_of(forecasts, late_cutoff)
    assert selected_late[p_key].generation_mw == 7800.0
