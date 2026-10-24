import math
from typing import List, Dict, Tuple, Optional
from datetime import datetime

from app.utils.datetime_utils import format_iso_utc
from app.services.data_normalizer import NormalizedActual, NormalizedForecast
from app.schemas.forecast import (
    ForecastActualPoint,
    ForecastMetrics,
    DataCoverage,
    PeriodStatus
)


def match_and_calculate_metrics(
    expected_periods: List[datetime],
    selected_forecasts: Dict[datetime, NormalizedForecast],
    actuals: Dict[datetime, NormalizedActual]
) -> Tuple[List[ForecastActualPoint], ForecastMetrics, DataCoverage]:
    """
    Matches selected forecasts with actual generation records across all expected delivery periods.
    Computes summary metrics (MAE, RMSE, Signed Bias, Max Absolute Error) exclusively from matched periods.
    Computes data coverage counts according to documented counting conventions.
    """
    points: List[ForecastActualPoint] = []
    matched_errors: List[Tuple[datetime, float, float]] = []  # (delivery, signed_error, abs_error)

    for period in expected_periods:
        period_str = format_iso_utc(period)
        f_rec = selected_forecasts.get(period)
        a_rec = actuals.get(period)

        f_val = f_rec.generation_mw if f_rec else None
        a_val = a_rec.generation_mw if a_rec else None
        f_pub = format_iso_utc(f_rec.publish_time) if f_rec else None

        status: PeriodStatus
        signed_error: Optional[float] = None
        abs_error: Optional[float] = None

        if f_val is not None and a_val is not None:
            status = "matched"
            signed_error = round(f_val - a_val, 2)
            abs_error = round(abs(signed_error), 2)
            matched_errors.append((period, signed_error, abs_error))
        elif f_val is not None and a_val is None:
            status = "missing_actual"
        elif f_val is None and a_val is not None:
            status = "missing_forecast"
        else:
            status = "missing_both"

        points.append(
            ForecastActualPoint(
                deliveryStart=period_str,
                forecastGenerationMw=round(f_val, 2) if f_val is not None else None,
                actualGenerationMw=round(a_val, 2) if a_val is not None else None,
                forecastPublishedAt=f_pub,
                signedErrorMw=signed_error,
                absoluteErrorMw=abs_error,
                status=status
            )
        )

    # Calculate metrics
    if not matched_errors:
        metrics = ForecastMetrics(
            maeMw=None,
            rmseMw=None,
            biasMw=None,
            maxAbsoluteErrorMw=None,
            maxErrorDeliveryStart=None
        )
    else:
        n = len(matched_errors)
        signed_list = [err[1] for err in matched_errors]
        abs_list = [err[2] for err in matched_errors]

        mae = round(sum(abs_list) / n, 2)
        rmse = round(math.sqrt(sum(e * e for e in signed_list) / n), 2)
        bias = round(sum(signed_list) / n, 2)

        # Max absolute error and its delivery start (deterministic: first chronological occurrence)
        max_abs = max(abs_list)
        max_period_dt = next(err[0] for err in matched_errors if err[2] == max_abs)
        max_period_str = format_iso_utc(max_period_dt)

        metrics = ForecastMetrics(
            maeMw=mae,
            rmseMw=rmse,
            biasMw=bias,
            maxAbsoluteErrorMw=round(max_abs, 2),
            maxErrorDeliveryStart=max_period_str
        )

    # Calculate coverage
    matched_count = len(matched_errors)
    missing_forecast_count = sum(1 for pt in points if pt.forecastGenerationMw is None)
    missing_actual_count = sum(1 for pt in points if pt.actualGenerationMw is None)

    coverage = DataCoverage(
        expectedPeriods=len(expected_periods),
        matchedPeriods=matched_count,
        missingForecastPeriods=missing_forecast_count,
        missingActualPeriods=missing_actual_count
    )

    return points, metrics, coverage
