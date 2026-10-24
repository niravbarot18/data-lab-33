import re
from datetime import date
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status

from app.core.config import settings
from app.schemas.forecast import ForecastAnalysisResponse
from app.services.analysis_service import run_forecast_analysis
from app.services.elexon_client import ElexonUpstreamError

router = APIRouter()

CUTOFF_REGEX = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")


@router.get("/health", summary="Readiness and health check")
async def health_check():
    """
    Checks that the backend process is running and responsive.
    """
    return {
        "status": "ok",
        "service": "windiq-api"
    }


@router.get(
    "/analysis",
    response_model=ForecastAnalysisResponse,
    summary="Get wind forecast accuracy analysis as of decision cutoff"
)
async def get_forecast_analysis(
    decision_date: date = Query(
        ...,
        description="Decision date in January 2026 (YYYY-MM-DD)"
    ),
    cutoff: str = Query(
        default=settings.DEFAULT_CUTOFF_TIME,
        description="Cutoff time in HH:mm (interpreted in Europe/London)"
    ),
    timezone: str = Query(
        default="Europe/London",
        description="Timezone for the cutoff and decision date (default Europe/London)"
    )
):
    # Validate January 2026 window
    jan_start = date(2026, 1, 1)
    jan_end = date(2026, 1, 31)
    if not (jan_start <= decision_date <= jan_end):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"decision_date '{decision_date}' is outside the supported January 2026 analysis window (2026-01-01 to 2026-01-31)."
        )

    # Validate cutoff format
    if not CUTOFF_REGEX.match(cutoff):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid cutoff format '{cutoff}'. Expected 24-hour time in 'HH:mm' format (00:00 to 23:59)."
        )

    # Validate timezone
    if timezone != "Europe/London":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported timezone '{timezone}'. Only 'Europe/London' is supported for UK Elexon BMRS."
        )

    try:
        response = await run_forecast_analysis(
            decision_date=decision_date,
            cutoff_time_str=cutoff,
            timezone_name=timezone
        )
        return response
    except ElexonUpstreamError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"code": exc.code, "message": exc.message}
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_SERVER_ERROR", "message": f"An error occurred during analysis: {str(exc)}"}
        ) from exc
