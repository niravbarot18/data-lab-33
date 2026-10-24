export type PeriodStatus =
  | "matched"
  | "missing_forecast"
  | "missing_actual"
  | "missing_both";

export interface AnalysisFilters {
  decisionDate: string; // YYYY-MM-DD in January 2026
  cutoffTime: string;   // HH:mm in Europe/London
  timezone?: string;
}

export interface ForecastActualPoint {
  deliveryStart: string;
  forecastGenerationMw: number | null;
  actualGenerationMw: number | null;
  forecastPublishedAt: string | null;
  signedErrorMw: number | null;
  absoluteErrorMw: number | null;
  status: PeriodStatus;
}

export interface ForecastMetrics {
  maeMw: number | null;
  rmseMw: number | null;
  biasMw: number | null;
  maxAbsoluteErrorMw: number | null;
  maxErrorDeliveryStart: string | null;
}

export interface DataCoverage {
  expectedPeriods: number;
  matchedPeriods: number;
  missingForecastPeriods: number;
  missingActualPeriods: number;
}

export interface AnalysisMetadata {
  decisionDate: string;
  deliveryDate: string;
  cutoffTime: string;
  timezone: string;
  analysisGeneratedAt: string;
  dataRetrievedAt: string | null;
  source: string;
  assumptions: string[];
}

export interface ForecastAnalysisResponse {
  metadata: AnalysisMetadata;
  metrics: ForecastMetrics;
  coverage: DataCoverage;
  points: ForecastActualPoint[];
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  requestId?: string | null;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}
