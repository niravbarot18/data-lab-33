import logging
from datetime import date, datetime
from typing import Dict

from app.utils.datetime_utils import (
    UTC,
    format_iso_utc,
    get_delivery_date_for_decision,
    parse_cutoff_to_utc,
    generate_expected_delivery_periods
)
from app.services.elexon_client import elexon_client
from app.services.data_normalizer import (
    normalize_actuals,
    normalize_forecasts,
    NormalizedActual
)
from app.services.forecast_service import select_forecasts_as_of
from app.services.metrics_service import match_and_calculate_metrics
from app.schemas.forecast import (
    ForecastAnalysisResponse,
    AnalysisMetadata
)

logger = logging.getLogger(__name__)


async def run_forecast_analysis(
    decision_date: date,
    cutoff_time_str: str = "09:50",
    timezone_name: str = "Europe/London"
) -> ForecastAnalysisResponse:
    """
    Executes the full end-to-end WindIQ forecast analysis:
    1. Derives delivery date (decision_date + 1 day).
    2. Converts cutoff to UTC.
    3. Retrieves actual generation (FUELHH) and forecast vintages (WINDFOR) from Elexon BMRS.
    4. Normalizes and validates records.
    5. Performs as-of cutoff vintage selection (strictly excluding forecasts published after cutoff).
    6. Matches selected forecasts with actuals by delivery period.
    7. Computes error metrics (MAE, RMSE, Signed Bias, Max Absolute Error) and coverage.
    8. Packages and returns the canonical typed response.
    """
    analysis_time = datetime.now(UTC)
    delivery_date = get_delivery_date_for_decision(decision_date)
    cutoff_utc = parse_cutoff_to_utc(decision_date, cutoff_time_str, timezone_name)
    expected_periods = generate_expected_delivery_periods(delivery_date, timezone_name)

    logger.info(
        "Running analysis: decision_date=%s, cutoff=%s (%s UTC), delivery_date=%s",
        decision_date, cutoff_time_str, cutoff_utc, delivery_date
    )

    # 1. Fetch data from Elexon BMRS
    raw_actuals, actual_retrieval_time = await elexon_client.fetch_fuelhh_actuals(delivery_date)
    raw_forecasts, forecast_retrieval_time = await elexon_client.fetch_windfor_vintages(decision_date, cutoff_utc)

    earliest_retrieval = min(actual_retrieval_time, forecast_retrieval_time)

    # 2. Normalize
    normalized_actuals = normalize_actuals(raw_actuals)
    actuals_by_delivery: Dict[datetime, NormalizedActual] = {
        act.delivery_start: act for act in normalized_actuals
    }

    normalized_forecasts = normalize_forecasts(raw_forecasts)

    # 3. As-of cutoff vintage selection
    selected_forecasts = select_forecasts_as_of(normalized_forecasts, cutoff_utc)

    # 4. Matching & metrics
    points, metrics, coverage = match_and_calculate_metrics(
        expected_periods=expected_periods,
        selected_forecasts=selected_forecasts,
        actuals=actuals_by_delivery
    )

    metadata = AnalysisMetadata(
        decisionDate=decision_date.isoformat(),
        deliveryDate=delivery_date.isoformat(),
        cutoffTime=cutoff_time_str,
        timezone=timezone_name,
        analysisGeneratedAt=format_iso_utc(analysis_time),
        dataRetrievedAt=format_iso_utc(earliest_retrieval),
        source="Elexon BMRS",
        assumptions=[
            "Delivery date is the calendar day after the decision date (Day-Ahead wholesale market context).",
            f"Configured decision cutoff ({cutoff_time_str} {timezone_name}) is an analytical assumption, not a confirmed single auction gate closure.",
            "Forecasts are filtered strictly to vintages published at or before the decision cutoff (as-of selection).",
            "Units are MW as published directly by Elexon BMRS."
        ]
    )

    return ForecastAnalysisResponse(
        metadata=metadata,
        metrics=metrics,
        coverage=coverage,
        points=points
    )
