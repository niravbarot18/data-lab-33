import { useState, useEffect, useRef, useCallback } from 'react';
import type { AnalysisFilters, ForecastAnalysisResponse } from '../types/forecast';
import { fetchForecastAnalysis } from '../services/forecastService';
import { extractErrorMessage } from '../utils/errors';

interface UseForecastAnalysisResult {
  data: ForecastAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  appliedFilters: AnalysisFilters;
  refetch: () => void;
  updateFiltersAndFetch: (newFilters: AnalysisFilters) => void;
}

export function useForecastAnalysis(initialFilters: AnalysisFilters): UseForecastAnalysisResult {
  const [appliedFilters, setAppliedFilters] = useState<AnalysisFilters>(initialFilters);
  const [data, setData] = useState<ForecastAnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Reference for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<number>(0);

  const executeFetch = useCallback(async (filters: AnalysisFilters) => {
    // Abort previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const currentRequestId = ++activeRequestIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchForecastAnalysis(filters, controller.signal);

      // Only update state if this is still the active request
      if (currentRequestId === activeRequestIdRef.current) {
        setData(response);
        setAppliedFilters(filters);
        setError(null);
        setLoading(false);
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Request was cancelled intentionally, do not set error
        return;
      }

      if (currentRequestId === activeRequestIdRef.current) {
        setError(extractErrorMessage(err));
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    executeFetch(initialFilters);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [executeFetch, initialFilters.decisionDate, initialFilters.cutoffTime]);

  const refetch = useCallback(() => {
    executeFetch(appliedFilters);
  }, [executeFetch, appliedFilters]);

  const updateFiltersAndFetch = useCallback((newFilters: AnalysisFilters) => {
    executeFetch(newFilters);
  }, [executeFetch]);

  return {
    data,
    loading,
    error,
    appliedFilters,
    refetch,
    updateFiltersAndFetch,
  };
}
