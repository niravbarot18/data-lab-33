import logging
from typing import List, Dict, Any, Tuple, Optional
from datetime import date, datetime, timedelta, timezone
import httpx

from app.core.config import settings
from app.utils.datetime_utils import format_iso_utc, UTC
from app.utils.cache import raw_fuelhh_cache, raw_windfor_cache

logger = logging.getLogger(__name__)


class ElexonUpstreamError(Exception):
    """Exception raised when Elexon API requests fail or return invalid responses."""
    def __init__(self, message: str, status_code: int = 502, code: str = "ELEXON_UPSTREAM_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class ElexonClient:
    """
    Official Elexon BMRS API client for FUELHH actuals and WINDFOR forecast streams.
    """
    def __init__(self, base_url: Optional[str] = None, timeout: Optional[float] = None):
        self.base_url = (base_url or settings.ELEXON_API_BASE_URL).rstrip("/")
        self.timeout = timeout or settings.ELEXON_TIMEOUT_SECONDS

    async def fetch_fuelhh_actuals(self, delivery_date: date) -> Tuple[List[Dict[str, Any]], datetime]:
        """
        Retrieves actual wind generation from FUELHH stream filtered to fuelType='WIND'.
        Endpoint: /datasets/FUELHH/stream
        Query parameters: settlementDateFrom, settlementDateTo, fuelType=WIND
        """
        cache_key = f"fuelhh_{delivery_date.isoformat()}"
        cached = raw_fuelhh_cache.get(cache_key)
        if cached is not None:
            logger.info("Using cached FUELHH actuals for delivery date %s", delivery_date)
            return cached["records"], cached["retrieved_at"]

        url = f"{self.base_url}/datasets/FUELHH/stream"
        params = {
            "settlementDateFrom": delivery_date.isoformat(),
            "settlementDateTo": delivery_date.isoformat(),
            "fuelType": "WIND",
        }

        retrieval_time = datetime.now(UTC)
        headers = {
            "Accept": "application/json",
            "User-Agent": "WindIQ/1.0 (UK Utility Decision Support)"
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params, headers=headers)
        except httpx.TimeoutException as exc:
            logger.error("Timeout connecting to Elexon FUELHH: %s", exc)
            raise ElexonUpstreamError(
                "Elexon BMRS timed out while retrieving actual generation data.",
                status_code=503,
                code="ELEXON_TIMEOUT"
            ) from exc
        except httpx.RequestError as exc:
            logger.error("Network error connecting to Elexon FUELHH: %s", exc)
            raise ElexonUpstreamError(
                f"Failed to communicate with Elexon BMRS: {str(exc)}",
                status_code=502,
                code="ELEXON_NETWORK_ERROR"
            ) from exc

        if response.status_code != 200:
            logger.error("Elexon FUELHH returned HTTP %d: %s", response.status_code, response.text[:200])
            raise ElexonUpstreamError(
                f"Elexon BMRS returned error {response.status_code} for actual wind generation.",
                status_code=502,
                code="ELEXON_UPSTREAM_ERROR"
            )

        try:
            records = response.json()
        except Exception as exc:
            logger.error("Failed to parse JSON from Elexon FUELHH: %s", exc)
            raise ElexonUpstreamError(
                "Failed to parse generation data from Elexon BMRS response.",
                status_code=502,
                code="ELEXON_PARSE_ERROR"
            ) from exc

        if not isinstance(records, list):
            # Some Elexon endpoints wrap results in a dict with 'data'
            if isinstance(records, dict) and "data" in records:
                records = records["data"]
            else:
                logger.error("Unexpected FUELHH response structure: %s", type(records))
                raise ElexonUpstreamError(
                    "Unexpected data format received from Elexon FUELHH.",
                    status_code=502,
                    code="ELEXON_INVALID_FORMAT"
                )

        # Cache raw response
        raw_fuelhh_cache.set(cache_key, {"records": records, "retrieved_at": retrieval_time})
        return records, retrieval_time

    async def fetch_windfor_vintages(
        self,
        decision_date: date,
        cutoff_utc: datetime,
        lookback_days: int = 3
    ) -> Tuple[List[Dict[str, Any]], datetime]:
        """
        Retrieves wind generation forecast vintages from WINDFOR stream.
        Endpoint: /datasets/WINDFOR/stream
        Query parameters: publishDateTimeFrom, publishDateTimeTo
        Fetches up to end of decision day or cutoff_utc to ensure all potential vintages are available for filtering.
        """
        # We query from 3 days prior to decision date up to the cutoff time or end of decision day
        from_dt = datetime.combine(decision_date - timedelta(days=lookback_days), datetime.min.time(), tzinfo=UTC)
        # Fetching up to max(cutoff_utc, decision_date 23:59:59Z) enables caching all vintages for that decision date
        end_of_decision_day = datetime.combine(decision_date, datetime.max.time(), tzinfo=UTC)
        to_dt = max(cutoff_utc, end_of_decision_day)

        cache_key = f"windfor_{decision_date.isoformat()}"
        cached = raw_windfor_cache.get(cache_key)
        if cached is not None and cached["to_dt"] >= cutoff_utc:
            logger.info("Using cached WINDFOR forecast vintages for decision date %s", decision_date)
            return cached["records"], cached["retrieved_at"]

        url = f"{self.base_url}/datasets/WINDFOR/stream"
        params = {
            "publishDateTimeFrom": format_iso_utc(from_dt),
            "publishDateTimeTo": format_iso_utc(to_dt),
        }

        retrieval_time = datetime.now(UTC)
        headers = {
            "Accept": "application/json",
            "User-Agent": "WindIQ/1.0 (UK Utility Decision Support)"
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params, headers=headers)
        except httpx.TimeoutException as exc:
            logger.error("Timeout connecting to Elexon WINDFOR: %s", exc)
            raise ElexonUpstreamError(
                "Elexon BMRS timed out while retrieving wind forecast vintages.",
                status_code=503,
                code="ELEXON_TIMEOUT"
            ) from exc
        except httpx.RequestError as exc:
            logger.error("Network error connecting to Elexon WINDFOR: %s", exc)
            raise ElexonUpstreamError(
                f"Failed to communicate with Elexon BMRS: {str(exc)}",
                status_code=502,
                code="ELEXON_NETWORK_ERROR"
            ) from exc

        if response.status_code != 200:
            logger.error("Elexon WINDFOR returned HTTP %d: %s", response.status_code, response.text[:200])
            raise ElexonUpstreamError(
                f"Elexon BMRS returned error {response.status_code} for wind forecasts.",
                status_code=502,
                code="ELEXON_UPSTREAM_ERROR"
            )

        try:
            records = response.json()
        except Exception as exc:
            logger.error("Failed to parse JSON from Elexon WINDFOR: %s", exc)
            raise ElexonUpstreamError(
                "Failed to parse forecast data from Elexon BMRS response.",
                status_code=502,
                code="ELEXON_PARSE_ERROR"
            ) from exc

        if not isinstance(records, list):
            if isinstance(records, dict) and "data" in records:
                records = records["data"]
            else:
                logger.error("Unexpected WINDFOR response structure: %s", type(records))
                raise ElexonUpstreamError(
                    "Unexpected data format received from Elexon WINDFOR.",
                    status_code=502,
                    code="ELEXON_INVALID_FORMAT"
                )

        raw_windfor_cache.set(cache_key, {
            "records": records,
            "retrieved_at": retrieval_time,
            "to_dt": to_dt
        })
        return records, retrieval_time


elexon_client = ElexonClient()
