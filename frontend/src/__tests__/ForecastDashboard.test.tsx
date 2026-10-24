import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ForecastDashboard } from '../pages/ForecastDashboard';
import * as forecastService from '../services/forecastService';
import type { ForecastAnalysisResponse } from '../types/forecast';

describe('ForecastDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSuccessfulResponse: ForecastAnalysisResponse = {
    metadata: {
      decisionDate: '2026-01-15',
      deliveryDate: '2026-01-16',
      cutoffTime: '09:50',
      timezone: 'Europe/London',
      analysisGeneratedAt: '2026-10-24T12:00:00Z',
      dataRetrievedAt: '2026-10-24T11:59:50Z',
      source: 'Elexon BMRS',
      assumptions: ['Delivery date is D+1.'],
    },
    metrics: {
      maeMw: 450.5,
      rmseMw: 520.1,
      biasMw: 320.0,
      maxAbsoluteErrorMw: 980.0,
      maxErrorDeliveryStart: '2026-01-16T14:00:00Z',
    },
    coverage: {
      expectedPeriods: 48,
      matchedPeriods: 24,
      missingForecastPeriods: 24,
      missingActualPeriods: 0,
    },
    points: [
      {
        deliveryStart: '2026-01-16T00:00:00Z',
        forecastGenerationMw: 7500.0,
        actualGenerationMw: 7000.0,
        forecastPublishedAt: '2026-01-15T09:30:00Z',
        signedErrorMw: 500.0,
        absoluteErrorMw: 500.0,
        status: 'matched',
      },
      {
        deliveryStart: '2026-01-16T00:30:00Z',
        forecastGenerationMw: null,
        actualGenerationMw: 7100.0,
        forecastPublishedAt: null,
        signedErrorMw: null,
        absoluteErrorMw: null,
        status: 'missing_forecast',
      },
    ],
  };

  it('renders loading state initially and then displays KPI cards with real values', async () => {
    vi.spyOn(forecastService, 'fetchForecastAnalysis').mockResolvedValue(mockSuccessfulResponse);

    render(<ForecastDashboard />);

    // Check header
    expect(screen.getByText('Wind Forecast Analysis')).toBeInTheDocument();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByText('450.5')).toBeInTheDocument(); // MAE
      expect(screen.getByText('+320')).toBeInTheDocument();  // Signed Bias
      expect(screen.getByText('980')).toBeInTheDocument();   // Max error
      expect(screen.getByText('24 / 48')).toBeInTheDocument(); // Coverage
    });

    // Check provenance banner
    expect(screen.getByText(/Source: Elexon BMRS/)).toBeInTheDocument();
    expect(screen.getByText(/Partial Data Coverage/)).toBeInTheDocument();
  });

  it('displays "Unavailable" for null metrics and does not show zero', async () => {
    const mockEmptyMetricsResponse: ForecastAnalysisResponse = {
      ...mockSuccessfulResponse,
      metrics: {
        maeMw: null,
        rmseMw: null,
        biasMw: null,
        maxAbsoluteErrorMw: null,
        maxErrorDeliveryStart: null,
      },
      coverage: {
        expectedPeriods: 48,
        matchedPeriods: 0,
        missingForecastPeriods: 48,
        missingActualPeriods: 48,
      },
      points: [],
    };

    vi.spyOn(forecastService, 'fetchForecastAnalysis').mockResolvedValue(mockEmptyMetricsResponse);

    render(<ForecastDashboard />);

    await waitFor(() => {
      const unavailables = screen.getAllByText('Unavailable');
      expect(unavailables.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('renders error state with retry button on API failure', async () => {
    vi.spyOn(forecastService, 'fetchForecastAnalysis').mockRejectedValue(
      new Error('Elexon BMRS connection timeout')
    );

    render(<ForecastDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load wind forecast analysis')).toBeInTheDocument();
      expect(screen.getByText('Elexon BMRS connection timeout')).toBeInTheDocument();
      expect(screen.getByText('Retry Analysis Request')).toBeInTheDocument();
    });
  });
});
