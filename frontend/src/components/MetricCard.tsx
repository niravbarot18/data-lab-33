import React from 'react';
import { Card, CardBody } from './ui/Card';
import { Tooltip } from './ui/Tooltip';
import { Skeleton } from './ui/Skeleton';

interface MetricCardProps {
  title: string;
  value: string | number | null;
  unit?: string;
  subtitle?: string;
  tooltipText?: string;
  trend?: 'positive' | 'negative' | 'neutral';
  loading?: boolean;
  highlightWarning?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  tooltipText,
  trend,
  loading = false,
  highlightWarning = false,
}) => {
  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-28 mb-3" />
        <Skeleton className="h-8 w-36 mb-2" />
        <Skeleton className="h-3.5 w-24" />
      </Card>
    );
  }

  const isUnavailable = value === null || value === undefined || value === '—';

  return (
    <Card
      className={`relative overflow-visible z-10 hover:z-30 transition-all duration-150 ${
        highlightWarning ? 'border-amber-300 bg-amber-50/20' : ''
      }`}
    >
      <CardBody className="p-5 overflow-visible">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{title}</span>
            {tooltipText && <Tooltip content={tooltipText} side="bottom" align="left" />}
          </div>
          {trend === 'positive' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700">
              Overforecast
            </span>
          )}
          {trend === 'negative' && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800">
              Underforecast
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-1.5">
          {isUnavailable ? (
            <span className="text-2xl font-bold text-slate-400">Unavailable</span>
          ) : (
            <>
              <span className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                {value}
              </span>
              {unit && <span className="text-xs font-medium text-slate-500 uppercase">{unit}</span>}
            </>
          )}
        </div>

        {subtitle && (
          <p className="mt-2 text-xs text-slate-500 leading-snug line-clamp-2 min-h-[1.75rem]" title={subtitle}>
            {subtitle}
          </p>
        )}
      </CardBody>
    </Card>
  );
};
