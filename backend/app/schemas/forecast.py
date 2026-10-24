from typing import List, Optional, Literal
from pydantic import BaseModel, Field

PeriodStatus = Literal["matched", "missing_forecast", "missing_actual", "missing_both"]


class ForecastActualPoint(BaseModel):
    deliveryStart: str = Field(..., description="Start of delivery period in UTC (ISO 8601)")
    forecastGenerationMw: Optional[float] = Field(None, description="Forecast wind generation in MW as of cutoff")
    actualGenerationMw: Optional[float] = Field(None, description="Actual wind generation in MW from FUELHH")
    forecastPublishedAt: Optional[str] = Field(None, description="Publication timestamp of selected forecast vintage in UTC (ISO 8601)")
    signedErrorMw: Optional[float] = Field(None, description="forecastGenerationMw - actualGenerationMw. Positive means overforecast.")
    absoluteErrorMw: Optional[float] = Field(None, description="abs(signedErrorMw)")
    status: PeriodStatus = Field(..., description="Status of the delivery period match")


class ForecastMetrics(BaseModel):
    maeMw: Optional[float] = Field(None, description="Mean Absolute Error in MW across matched periods")
    rmseMw: Optional[float] = Field(None, description="Root Mean Squared Error in MW across matched periods")
    biasMw: Optional[float] = Field(None, description="Mean Signed Bias in MW (mean(forecast - actual))")
    maxAbsoluteErrorMw: Optional[float] = Field(None, description="Maximum absolute error in MW")
    maxErrorDeliveryStart: Optional[str] = Field(None, description="Delivery start timestamp of the period with maximum absolute error")


class DataCoverage(BaseModel):
    expectedPeriods: int = Field(..., description="Total half-hourly periods expected in delivery window (e.g. 48)")
    matchedPeriods: int = Field(..., description="Count of periods having both forecast and actual data")
    missingForecastPeriods: int = Field(..., description="Count of expected periods missing eligible forecast")
    missingActualPeriods: int = Field(..., description="Count of expected periods missing actual generation data")


class AnalysisMetadata(BaseModel):
    decisionDate: str = Field(..., description="Decision date YYYY-MM-DD")
    deliveryDate: str = Field(..., description="Delivery date YYYY-MM-DD")
    cutoffTime: str = Field(..., description="Configured decision cutoff time HH:mm")
    timezone: str = Field(..., description="User-facing timezone (Europe/London)")
    analysisGeneratedAt: str = Field(..., description="Timestamp when analysis was generated (ISO 8601 UTC)")
    dataRetrievedAt: Optional[str] = Field(None, description="Timestamp when data was retrieved from source (ISO 8601 UTC)")
    source: str = Field("Elexon BMRS", description="Data source name")
    assumptions: List[str] = Field(default_factory=list, description="Explicit modeling assumptions")


class ForecastAnalysisResponse(BaseModel):
    metadata: AnalysisMetadata
    metrics: ForecastMetrics
    coverage: DataCoverage
    points: List[ForecastActualPoint]


class ApiErrorDetail(BaseModel):
    code: str
    message: str
    requestId: Optional[str] = None


class ApiErrorResponse(BaseModel):
    error: ApiErrorDetail
