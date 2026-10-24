import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.utils.datetime_utils import parse_to_aware_utc

logger = logging.getLogger(__name__)


class NormalizedActual(BaseModel):
    delivery_start: datetime
    generation_mw: float
    settlement_date: Optional[str] = None
    settlement_period: Optional[int] = None
    source_dataset: str = "FUELHH"


class NormalizedForecast(BaseModel):
    delivery_start: datetime
    publish_time: datetime
    generation_mw: float
    source_dataset: str = "WINDFOR"


def normalize_actuals(raw_records: List[Dict[str, Any]]) -> List[NormalizedActual]:
    """
    Normalizes FUELHH stream records into NormalizedActual instances.
    Filters exclusively to fuelType == 'WIND'.
    Handles timestamps, numeric conversions, and deterministic deduplication on delivery_start.
    """
    normalized_dict: Dict[datetime, NormalizedActual] = {}

    for record in raw_records:
        fuel_type = record.get("fuelType")
        if fuel_type != "WIND":
            continue

        start_time_raw = record.get("startTime")
        generation_raw = record.get("generation")

        if start_time_raw is None or generation_raw is None:
            logger.warning("Skipping FUELHH record missing required fields: %s", record)
            continue

        try:
            delivery_start = parse_to_aware_utc(start_time_raw)
        except Exception as exc:
            logger.warning("Skipping FUELHH record with malformed startTime '%s': %s", start_time_raw, exc)
            continue

        try:
            generation_mw = float(generation_raw)
        except (ValueError, TypeError) as exc:
            logger.warning("Skipping FUELHH record with non-numeric generation '%s': %s", generation_raw, exc)
            continue

        item = NormalizedActual(
            delivery_start=delivery_start,
            generation_mw=generation_mw,
            settlement_date=record.get("settlementDate"),
            settlement_period=record.get("settlementPeriod")
        )

        # Deterministic deduplication: keep item with latest settlementPeriod or first seen
        if delivery_start not in normalized_dict:
            normalized_dict[delivery_start] = item
        else:
            existing = normalized_dict[delivery_start]
            existing_sp = existing.settlement_period or 0
            new_sp = item.settlement_period or 0
            if new_sp > existing_sp:
                normalized_dict[delivery_start] = item

    # Return sorted by delivery_start
    return [normalized_dict[k] for k in sorted(normalized_dict.keys())]


def normalize_forecasts(raw_records: List[Dict[str, Any]]) -> List[NormalizedForecast]:
    """
    Normalizes WINDFOR stream records into NormalizedForecast instances.
    Preserves all publication vintages for each delivery period.
    Deterministic deduplication for identical (delivery_start, publish_time) pairs.
    """
    normalized_dict: Dict[tuple[datetime, datetime], NormalizedForecast] = {}

    for record in raw_records:
        start_time_raw = record.get("startTime")
        publish_time_raw = record.get("publishTime")
        generation_raw = record.get("generation")

        if start_time_raw is None or publish_time_raw is None or generation_raw is None:
            logger.warning("Skipping WINDFOR record missing required fields: %s", record)
            continue

        try:
            delivery_start = parse_to_aware_utc(start_time_raw)
            publish_time = parse_to_aware_utc(publish_time_raw)
        except Exception as exc:
            logger.warning("Skipping WINDFOR record with malformed timestamps: %s", exc)
            continue

        try:
            generation_mw = float(generation_raw)
        except (ValueError, TypeError) as exc:
            logger.warning("Skipping WINDFOR record with non-numeric generation '%s': %s", generation_raw, exc)
            continue

        key = (delivery_start, publish_time)
        item = NormalizedForecast(
            delivery_start=delivery_start,
            publish_time=publish_time,
            generation_mw=generation_mw,
            source_dataset=record.get("dataset", "WINDFOR")
        )

        # If identical delivery_start and publish_time exist, overwrite deterministically
        normalized_dict[key] = item

    # Return sorted by delivery_start, then publish_time
    sorted_keys = sorted(normalized_dict.keys(), key=lambda k: (k[0], k[1]))
    return [normalized_dict[k] for k in sorted_keys]
