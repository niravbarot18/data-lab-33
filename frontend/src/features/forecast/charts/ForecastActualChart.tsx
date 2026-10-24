import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
} from 'recharts';
import type { ForecastActualPoint } from '../../../types/forecast';
import { Card, CardHeader, CardTitle, CardBody } from '../../../components/ui/Card';
import { formatLondonTime, formatSettlementWindow } from '../../../utils/date';
import { formatMw } from '../../../utils/format';

interface ForecastActualChartProps {
  points: ForecastActualPoint[];
  selectedPeriodStart?: string | null;
  onSelectPeriod?: (periodStart: string | null) => void;
  loading?: boolean;
}

export const ForecastActualChart: React.FC<ForecastActualChartProps> = ({
  points,
  selectedPeriodStart,
  onSelectPeriod,
}) => {
  // Prepare chart data: format time labels and preserve nulls
  const chartData = points.map((p) => ({
    time: formatLondonTime(p.deliveryStart),
    deliveryStart: p.deliveryStart,
    forecast: p.forecastGenerationMw,
    actual: p.actualGenerationMw,
    forecastPublishedAt: p.forecastPublishedAt,
    status: p.status,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;

    return (
      <div className="bg-navy-900 text-white p-3 rounded-md shadow-xl text-xs border border-slate-700 min-w-[200px]">
        <p className="font-semibold text-slate-200 mb-1.5 border-b border-slate-700 pb-1">
          Period: {formatSettlementWindow(data.deliveryStart)}
        </p>
        <div className="space-y-1">
          <div className="flex justify-between items-center text-teal-300">
            <span>Actual Outturn:</span>
            <span className="font-mono font-bold">{formatMw(data.actual)}</span>
          </div>
          <div className="flex justify-between items-center text-blue-300">
            <span>Selected Forecast:</span>
            <span className="font-mono font-bold">{formatMw(data.forecast)}</span>
          </div>
          {data.forecastPublishedAt && (
            <p className="text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800">
              Published: {new Date(data.forecastPublishedAt).toUTCString().replace('GMT', 'UTC')}
            </p>
          )}
          <div className="text-[10px] text-slate-400 mt-0.5">
            Status: <span className="capitalize text-slate-300">{data.status.replace('_', ' ')}</span>
          </div>
        </div>
      </div>
    );
  };

  const selectedPoint = chartData.find((p) => p.deliveryStart === selectedPeriodStart);

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Forecast vs. Actual Wind Generation</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Comparison of actual UK wind generation (FUELHH) and the latest available forecast published prior to cutoff (WINDFOR).
          </p>
        </div>
      </CardHeader>
      <CardBody className="p-4 pt-1">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload[0]) {
                  const clickedStart = e.activePayload[0].payload.deliveryStart;
                  onSelectPeriod?.(clickedStart === selectedPeriodStart ? null : clickedStart);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="time"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                interval={3}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k MW`}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
              />
              <Line
                name="Actual Wind Generation (FUELHH)"
                type="monotone"
                dataKey="actual"
                stroke="#0D9488" // Actual Teal
                strokeWidth={2.5}
                dot={{ r: 2, fill: '#0D9488' }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
              <Line
                name="Selected Forecast as-of Cutoff (WINDFOR)"
                type="monotone"
                dataKey="forecast"
                stroke="#2563EB" // Forecast Blue
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ r: 3, fill: '#2563EB' }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
              {selectedPoint && selectedPoint.actual !== null && (
                <ReferenceDot
                  x={selectedPoint.time}
                  y={selectedPoint.actual}
                  r={7}
                  fill="#F59E0B"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-[11px] text-slate-400 text-right mt-1 italic">
          * Gaps in line series represent periods with missing forecast or actual records.
        </div>
      </CardBody>
    </Card>
  );
};
