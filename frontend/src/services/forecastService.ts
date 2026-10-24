import { apiGet } from './apiClient';
import type { AnalysisFilters, ForecastAnalysisResponse } from '../types/forecast';

export async function fetchForecastAnalysis(
  filters: AnalysisFilters,
  signal?: AbortSignal
): Promise<ForecastAnalysisResponse> {
  const queryParams: Record<string, string> = {
    decision_date: filters.decisionDate,
    cutoff: filters.cutoffTime,
    timezone: filters.timezone || 'Europe/London',
  };

  return apiGet<ForecastAnalysisResponse>('/analysis', queryParams, signal);
}
