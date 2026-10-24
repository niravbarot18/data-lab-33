import React, { useState } from 'react';
import { Calendar, Clock, ArrowRight, Play, RefreshCw, Info } from 'lucide-react';
import { Card, CardBody } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import type { AnalysisFilters } from '../../../types/forecast';
import { formatDdMmYyyy } from '../../../utils/date';

interface DecisionContextPanelProps {
  currentFilters: AnalysisFilters;
  onApplyFilters: (filters: AnalysisFilters) => void;
  loading: boolean;
}

export const DecisionContextPanel: React.FC<DecisionContextPanelProps> = ({
  currentFilters,
  onApplyFilters,
  loading,
}) => {
  const [decisionDate, setDecisionDate] = useState<string>(currentFilters.decisionDate);
  const [cutoffTime, setCutoffTime] = useState<string>(currentFilters.cutoffTime);

  // Compute assumed delivery date: day after decisionDate
  const getDeliveryDateStr = (decDateStr: string): string => {
    try {
      const parts = decDateStr.split('-');
      const d = new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)));
      d.setUTCDate(d.getUTCDate() + 1);
      return d.toISOString().split('T')[0];
    } catch {
      return '—';
    }
  };

  const assumedDeliveryDate = getDeliveryDateStr(decisionDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters({
      decisionDate,
      cutoffTime,
      timezone: 'Europe/London',
    });
  };

  // January 2026 dates list: 2026-01-01 to 2026-01-30
  const janDays = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    return `2026-01-${day < 10 ? '0' + day : day}`;
  });

  const isDirty = decisionDate !== currentFilters.decisionDate || cutoffTime !== currentFilters.cutoffTime;

  return (
    <Card className="mb-6 shadow-sm border-slate-200">
      <CardBody className="p-5">
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-grow">
            {/* Decision Date */}
            <div>
              <label htmlFor="decision-date-select" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Decision Date (Jan 2026)
              </label>
              <select
                id="decision-date-select"
                value={decisionDate}
                onChange={(e) => setDecisionDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm font-medium font-mono text-slate-900 focus:bg-white focus:border-forecast focus:ring-1 focus:ring-forecast focus:outline-none transition-colors"
              >
                {janDays.map((d) => (
                  <option key={d} value={d}>
                    {formatDdMmYyyy(d)}
                  </option>
                ))}
              </select>
            </div>

            {/* Decision Cutoff Time */}
            <div>
              <label htmlFor="cutoff-time-input" className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Decision Cutoff (Europe/London)
              </label>
              <div className="flex gap-2">
                <input
                  id="cutoff-time-input"
                  type="time"
                  value={cutoffTime}
                  onChange={(e) => setCutoffTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-sm font-medium font-mono text-slate-900 focus:bg-white focus:border-forecast focus:ring-1 focus:ring-forecast focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Assumed Delivery Context */}
            <div className="bg-slate-50 rounded-md p-2.5 border border-slate-200 flex flex-col justify-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <ArrowRight className="w-3 h-3 text-slate-400" /> Assumed Delivery Date
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-sm font-bold text-navy-900 font-mono">
                  {formatDdMmYyyy(assumedDeliveryDate)}
                </span>
                <span className="text-xs text-slate-500">
                  Next-Day Delivery
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 flex-shrink-0 self-end">
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              icon={isDirty ? <Play className="w-4 h-4 fill-current" /> : <RefreshCw className="w-4 h-4" />}
            >
              {isDirty ? 'Apply Context' : 'Refresh Data'}
            </Button>
          </div>
        </form>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Configured default cutoff is <strong>09:50 Europe/London</strong> (analytical assumption). Only forecasts published at or before cutoff are evaluated.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
              Timezone: Europe/London (GMT)
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
