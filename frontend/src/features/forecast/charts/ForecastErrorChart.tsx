import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { ForecastActualPoint } from '../../../types/forecast';
import { Card, CardHeader, CardTitle, CardBody } from '../../../components/ui/Card';
import { formatLondonTime, formatSettlementWindow } from '../../../utils/date';
import { formatSignedErrorMw, formatMw } from '../../../utils/format';

interface ForecastErrorChartProps {
  points: ForecastActualPoint[];
  selectedPeriodStart?: string | null;
  onSelectPeriod?: (periodStart: string | null) => void;
}

export const ForecastErrorChart: React.FC<ForecastErrorChartProps> = ({
  points,
  selectedPeriodStart,
  onSelectPeriod,
}) => {
  // Only map points that have signed errors
  const chartData = points.map((p) => ({
    time: formatLondonTime(p.deliveryStart),
    deliveryStart: p.deliveryStart,
    signedError: p.signedErrorMw,
    absError: p.absoluteErrorMw,
    forecast: p.forecastGenerationMw,
    actual: p.actualGenerationMw,
    isLargeError: p.absoluteErrorMw !== null && p.absoluteErrorMw >= 1000,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    if (data.signedError === null) return null;

    const isOver = data.signedError > 0;
    const isUnder = data.signedError < 0;

    return (
      <div className="bg-navy-900 text-white p-3 rounded-md shadow-xl text-xs border border-slate-700 min-w-[200px]">
        <p className="font-semibold text-slate-200 mb-1 pb-1 border-b border-slate-700">
          Period: {formatSettlementWindow(data.deliveryStart)}
        </p>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-slate-300">Signed Error (F - A):</span>
            <span
              className={`font-mono font-bold ${
                isOver ? 'text-blue-400' : isUnder ? 'text-amber-400' : 'text-slate-300'
              }`}
            >
              {formatSignedErrorMw(data.signedError)}
            </span>
          </div>
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span>Absolute Error:</span>
            <span className="font-mono">{formatMw(data.absError)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 text-[11px]">
            <span>Classification:</span>
            <span className="capitalize font-medium text-slate-200">
              {isOver ? 'Overforecast' : isUnder ? 'Underforecast' : 'Exact Match'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Signed Forecast Error by Delivery Period (Forecast − Actual)</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Positive bars (blue) indicate overforecasting; negative bars indicate underforecasting. Large misses (≥1,000 MW) highlighted in amber.
          </p>
        </div>
      </CardHeader>
      <CardBody className="p-4 pt-1">
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
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
                tickFormatter={(v) => `${v > 0 ? '+' : ''}${v} MW`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={0} stroke="#475569" strokeWidth={1.5} />
              <Bar dataKey="signedError" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, index) => {
                  const isSelected = entry.deliveryStart === selectedPeriodStart;
                  let fillColor = entry.signedError && entry.signedError > 0 ? '#3B82F6' : '#0F766E';
                  if (entry.isLargeError) {
                    fillColor = '#D97706'; // Amber highlight for noteworthy misses
                  }
                  if (isSelected) {
                    fillColor = '#F59E0B'; // Active selection
                  }
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={fillColor}
                      stroke={isSelected ? '#101C2C' : 'none'}
                      strokeWidth={isSelected ? 1.5 : 0}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardBody>
    </Card>
  );
};
