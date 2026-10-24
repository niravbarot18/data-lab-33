import logging
from typing import List, Dict, Optional
from datetime import datetime

from app.utils.datetime_utils import UTC
from app.services.data_normalizer import NormalizedForecast

logger = logging.getLogger(__name__)


def select_forecasts_as_of(
    forecasts: List[NormalizedForecast],
    cutoff_utc: datetime
) -> Dict[datetime, NormalizedForecast]:
    """
    Selects the authoritative wind generation forecast as of a specified decision cutoff.
    
    Selection Rule:
    1. Every forecast timestamp must be timezone-aware (normalized to UTC).
    2. Exclude any forecast where publish_time > cutoff_utc.
       (Forecast published exactly at cutoff is eligible; forecast after cutoff is strictly excluded).
    3. For each delivery_start, select the eligible forecast vintage with the greatest publish_time.
    4. Deterministic tie-breaker: if two records share the same delivery_start and publish_time,
       the higher generation value or deterministic candidate is chosen.
    
    Returns:
        Dict mapping delivery_start (datetime in UTC) -> selected NormalizedForecast.
        Delivery periods with no eligible forecast will not be present in the returned dictionary.
    """
    if cutoff_utc.tzinfo is None:
        raise ValueError("cutoff_utc must be timezone-aware")

    # Ensure cutoff is in UTC
    cutoff_utc_norm = cutoff_utc.astimezone(UTC)
    selected: Dict[datetime, NormalizedForecast] = {}

    for forecast in forecasts:
        if forecast.delivery_start.tzinfo is None or forecast.publish_time.tzinfo is None:
            raise ValueError("All forecast timestamps must be timezone-aware")

        pub_utc = forecast.publish_time.astimezone(UTC)

        # Strictly exclude forecasts published after the decision cutoff
        if pub_utc > cutoff_utc_norm:
            continue

        delivery = forecast.delivery_start.astimezone(UTC)
        current = selected.get(delivery)

        if current is None:
            selected[delivery] = forecast
        else:
            current_pub_utc = current.publish_time.astimezone(UTC)
            if pub_utc > current_pub_utc:
                # Later eligible vintage wins
                selected[delivery] = forecast
            elif pub_utc == current_pub_utc:
                # Deterministic tie-breaker: keep the one with higher generation value
                if forecast.generation_mw > current.generation_mw:
                    selected[delivery] = forecast

    return selected
