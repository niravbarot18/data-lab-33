from datetime import datetime, timezone, timedelta
import math
import pytest

from app.services.data_normalizer import NormalizedActual, NormalizedForecast
from app.services.metrics_service import match_and_calculate_metrics

UTC = timezone.utc


def test_hand_calculated_metrics():
    # 3 periods:
    # Period 0: Forecast 100, Actual 80 -> error = +20, abs_err = 20
    # Period 1: Forecast 90, Actual 110 -> error = -20, abs_err = 20
    # Period 2: Forecast 150, Actual 100 -> error = +50, abs_err = 50
    #
    # Errors: [20, -20, 50]
    # Sum errors = 50, Mean Signed Bias = 50 / 3 = 16.67
    # Abs errors: [20, 20, 50]
    # Sum abs errors = 90, MAE = 90 / 3 = 30.0
    # Squared errors: [400, 400, 2500] = 3300
    # Mean squared error = 3300 / 3 = 1100
    # RMSE = sqrt(1100) = 33.17
    # Max abs error = 50.0 at Period 2
    p0 = datetime(2026, 1, 16, 0, 0, tzinfo=UTC)
    p1 = datetime(2026, 1, 16, 0, 30, tzinfo=UTC)
    p2 = datetime(2026, 1, 16, 1, 0, tzinfo=UTC)
    expected = [p0, p1, p2]

    f_pub = datetime(2026, 1, 15, 9, 0, tzinfo=UTC)
    selected_f = {
        p0: NormalizedForecast(delivery_start=p0, publish_time=f_pub, generation_mw=100.0),
        p1: NormalizedForecast(delivery_start=p1, publish_time=f_pub, generation_mw=90.0),
        p2: NormalizedForecast(delivery_start=p2, publish_time=f_pub, generation_mw=150.0),
    }

    actuals = {
        p0: NormalizedActual(delivery_start=p0, generation_mw=80.0),
        p1: NormalizedActual(delivery_start=p1, generation_mw=110.0),
        p2: NormalizedActual(delivery_start=p2, generation_mw=100.0),
    }

    points, metrics, coverage = match_and_calculate_metrics(expected, selected_f, actuals)

    assert coverage.expectedPeriods == 3
    assert coverage.matchedPeriods == 3
    assert coverage.missingForecastPeriods == 0
    assert coverage.missingActualPeriods == 0

    assert metrics.maeMw == 30.0
    assert metrics.rmseMw == 33.17
    assert metrics.biasMw == 16.67
    assert metrics.maxAbsoluteErrorMw == 50.0
    assert metrics.maxErrorDeliveryStart == "2026-01-16T01:00:00Z"


def test_positive_bias_indicates_overforecasting():
    # Forecast consistently higher than actual
    p = datetime(2026, 1, 16, 0, 0, tzinfo=UTC)
    f_pub = datetime(2026, 1, 15, 9, 0, tzinfo=UTC)
    selected_f = {p: NormalizedForecast(delivery_start=p, publish_time=f_pub, generation_mw=5000.0)}
    actuals = {p: NormalizedActual(delivery_start=p, generation_mw=4000.0)}

    _, metrics, _ = match_and_calculate_metrics([p], selected_f, actuals)
    assert metrics.biasMw == 1000.0  # Positive = overforecast


def test_negative_bias_indicates_underforecasting():
    # Forecast consistently lower than actual
    p = datetime(2026, 1, 16, 0, 0, tzinfo=UTC)
    f_pub = datetime(2026, 1, 15, 9, 0, tzinfo=UTC)
    selected_f = {p: NormalizedForecast(delivery_start=p, publish_time=f_pub, generation_mw=3000.0)}
    actuals = {p: NormalizedActual(delivery_start=p, generation_mw=4500.0)}

    _, metrics, _ = match_and_calculate_metrics([p], selected_f, actuals)
    assert metrics.biasMw == -1500.0  # Negative = underforecast


def test_no_matched_pairs_returns_null_metrics():
    # 2 expected periods, neither has both actual and forecast
    p0 = datetime(2026, 1, 16, 0, 0, tzinfo=UTC)
    p1 = datetime(2026, 1, 16, 0, 30, tzinfo=UTC)
    expected = [p0, p1]

    # p0 has only forecast, p1 has only actual
    f_pub = datetime(2026, 1, 15, 9, 0, tzinfo=UTC)
    selected_f = {p0: NormalizedForecast(delivery_start=p0, publish_time=f_pub, generation_mw=1000.0)}
    actuals = {p1: NormalizedActual(delivery_start=p1, generation_mw=2000.0)}

    points, metrics, coverage = match_and_calculate_metrics(expected, selected_f, actuals)

    assert coverage.expectedPeriods == 2
    assert coverage.matchedPeriods == 0
    assert coverage.missingForecastPeriods == 1  # p1 is missing forecast
    assert coverage.missingActualPeriods == 1    # p0 is missing actual

    assert metrics.maeMw is None
    assert metrics.rmseMw is None
    assert metrics.biasMw is None
    assert metrics.maxAbsoluteErrorMw is None
    assert metrics.maxErrorDeliveryStart is None


def test_coverage_and_missing_both_convention():
    p0 = datetime(2026, 1, 16, 0, 0, tzinfo=UTC)
    p1 = datetime(2026, 1, 16, 0, 30, tzinfo=UTC)
    p2 = datetime(2026, 1, 16, 1, 0, tzinfo=UTC)
    p3 = datetime(2026, 1, 16, 1, 30, tzinfo=UTC)
    expected = [p0, p1, p2, p3]

    f_pub = datetime(2026, 1, 15, 9, 0, tzinfo=UTC)
    # p0: matched
    # p1: missing actual
    # p2: missing forecast
    # p3: missing both
    selected_f = {
        p0: NormalizedForecast(delivery_start=p0, publish_time=f_pub, generation_mw=100.0),
        p1: NormalizedForecast(delivery_start=p1, publish_time=f_pub, generation_mw=200.0),
    }
    actuals = {
        p0: NormalizedActual(delivery_start=p0, generation_mw=100.0),
        p2: NormalizedActual(delivery_start=p2, generation_mw=300.0),
    }

    points, metrics, coverage = match_and_calculate_metrics(expected, selected_f, actuals)

    assert coverage.expectedPeriods == 4
    assert coverage.matchedPeriods == 1
    assert coverage.missingForecastPeriods == 2  # p2, p3
    assert coverage.missingActualPeriods == 2    # p1, p3

    statuses = [pt.status for pt in points]
    assert statuses == ["matched", "missing_actual", "missing_forecast", "missing_both"]
