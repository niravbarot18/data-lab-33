import React, { useState } from 'react';
import { useForecastAnalysis } from '../hooks/useForecastAnalysis';
import { DecisionContextPanel } from '../features/forecast/components/DecisionContextPanel';
import { DataStatusBanner } from '../components/DataStatusBanner';
import { MetricCard } from '../components/MetricCard';
import { ForecastActualChart } from '../features/forecast/charts/ForecastActualChart';
import { ForecastErrorChart } from '../features/forecast/charts/ForecastErrorChart';
import { DeliveryPeriodTable } from '../features/forecast/components/DeliveryPeriodTable';
import { ForecastVintagePanel } from '../features/forecast/components/ForecastVintagePanel';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/ui/EmptyState';
import { formatMw, formatSignedErrorMw, formatPercentage } from '../utils/format';
import { formatSettlementWindow } from '../utils/date';
import type { AnalysisFilters } from '../types/forecast';

export const ForecastDashboard: React.FC = () => {
  // Default decision date: 2026-01-15, default cutoff: 09:50 Europe/London
  const [filters, setFilters] = useState<AnalysisFilters>({
    decisionDate: '2026-01-15',
    cutoffTime: '09:50',
    timezone: 'Europe/London',
  });

  const [selectedPeriodStart, setSelectedPeriodStart] = useState<string | null>(null);

  const {
    data,
    loading,
    error,
    appliedFilters,
    refetch,
    updateFiltersAndFetch,
  } = useForecastAnalysis(filters);

  const handleApplyFilters = (newFilters: AnalysisFilters) => {
    setFilters(newFilters);
    setSelectedPeriodStart(null);
    updateFiltersAndFetch(newFilters);
  };

  const selectedPoint = data?.points.find((p) => p.deliveryStart === selectedPeriodStart) || null;

  // Determine trend for signed bias
  const biasTrend =
    data?.metrics.biasMw !== null && data?.metrics.biasMw !== undefined
      ? data.metrics.biasMw > 0
        ? 'positive'
        : data.metrics.biasMw < 0
        ? 'negative'
        : 'neutral'
      : undefined;

  return (
    <div className="space-y-6">
      {/* Page Title & Purpose */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Wind Forecast Analysis
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-3xl">
          Evaluate UK day-ahead wholesale electricity procurement decisions. Assesses national wind generation forecasts (Elexon WINDFOR) available at the decision cutoff against actual outturns (Elexon FUELHH).
        </p>
      </div>

      {/* Decision Context Control Panel */}
      <DecisionContextPanel
        currentFilters={appliedFilters}
        onApplyFilters={handleApplyFilters}
        loading={loading}
      />

      {/* Upstream / Network Error State */}
      {error && (
        <ErrorState
          message={error}
          onRetry={refetch}
        />
      )}

      {/* Provenance & Completeness Banner */}
      {data && !error && (
        <DataStatusBanner
          metadata={data.metadata}
          coverage={data.coverage}
          loading={loading}
        />
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Mean Absolute Error (MAE)"
          value={data?.metrics.maeMw !== null && data?.metrics.maeMw !== undefined ? formatMw(data.metrics.maeMw, false) : '—'}
          unit="MW"
          subtitle="Average error magnitude"
          tooltipText="Mean of absolute errors (|Forecast − Actual|) across all settlement periods with both forecast and actual data."
          loading={loading}
        />

        <MetricCard
          title="Signed Bias"
          value={
            data?.metrics.biasMw !== null && data?.metrics.biasMw !== undefined
              ? formatSignedErrorMw(data.metrics.biasMw).replace(' MW', '')
              : '—'
          }
          unit="MW"
          trend={biasTrend}
          subtitle={
            data?.metrics.biasMw !== null && data?.metrics.biasMw !== undefined
              ? data.metrics.biasMw > 0
                ? 'Systematic overforecast'
                : 'Systematic underforecast'
              : 'Matched periods required'
          }
          tooltipText="Mean of signed errors (Forecast − Actual). Positive indicates overforecasting; negative indicates underforecasting."
          loading={loading}
        />

        <MetricCard
          title="Largest Absolute Miss"
          value={
            data?.metrics.maxAbsoluteErrorMw !== null && data?.metrics.maxAbsoluteErrorMw !== undefined
              ? formatMw(data.metrics.maxAbsoluteErrorMw, false)
              : '—'
          }
          unit="MW"
          subtitle={
            data?.metrics.maxErrorDeliveryStart
              ? `Period: ${formatSettlementWindow(data.metrics.maxErrorDeliveryStart)}`
              : 'No matched misses'
          }
          tooltipText="The maximum single-period absolute forecast error (|Forecast − Actual|) observed during the delivery day."
          highlightWarning={Boolean(data?.metrics.maxAbsoluteErrorMw && data.metrics.maxAbsoluteErrorMw >= 1000)}
          loading={loading}
        />

        <MetricCard
          title="Data Coverage"
          value={
            data?.coverage
              ? `${data.coverage.matchedPeriods} / ${data.coverage.expectedPeriods}`
              : '—'
          }
          unit="Periods"
          subtitle={
            data?.coverage
              ? `${formatPercentage(data.coverage.matchedPeriods / data.coverage.expectedPeriods)} coverage · ${data.coverage.missingForecastPeriods} missing`
              : '48 settlement periods expected'
          }
          tooltipText="Count and percentage of expected half-hourly settlement periods having both an eligible forecast and actual outturn data."
          loading={loading}
        />
      </div>

      {/* Main Analysis Visualizations */}
      {data && !error && (
        <>
          {/* Optional Vintage Inspector Panel when a period is selected */}
          <ForecastVintagePanel
            selectedPoint={selectedPoint}
            metadata={data.metadata}
            onClearSelection={() => setSelectedPeriodStart(null)}
          />

          {/* Forecast vs. Actual Line Chart */}
          <ForecastActualChart
            points={data.points}
            selectedPeriodStart={selectedPeriodStart}
            onSelectPeriod={setSelectedPeriodStart}
            loading={loading}
          />

          {/* Signed Error Bar Chart */}
          <ForecastErrorChart
            points={data.points}
            selectedPeriodStart={selectedPeriodStart}
            onSelectPeriod={setSelectedPeriodStart}
          />

          {/* Delivery Period Detail Table */}
          <DeliveryPeriodTable
            points={data.points}
            selectedPeriodStart={selectedPeriodStart}
            onSelectPeriod={setSelectedPeriodStart}
          />
        </>
      )}

      {/* Empty State when no data */}
      {!loading && !data && !error && (
        <EmptyState
          title="No forecast data returned"
          description="Select a decision date and cutoff time to fetch and analyze Elexon BMRS generation forecasts."
          action={
            <button
              onClick={() => handleApplyFilters(filters)}
              className="text-sm text-forecast hover:underline font-medium"
            >
              Run Analysis
            </button>
          }
        />
      )}
    </div>
  );
};
