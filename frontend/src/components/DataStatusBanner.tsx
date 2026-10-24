import React from 'react';
import { Database, AlertTriangle, CheckCircle2, Clock, Info } from 'lucide-react';
import type { AnalysisMetadata, DataCoverage } from '../types/forecast';
import { formatDateTimeLondon } from '../utils/date';

interface DataStatusBannerProps {
  metadata?: AnalysisMetadata;
  coverage?: DataCoverage;
  loading?: boolean;
}

export const DataStatusBanner: React.FC<DataStatusBannerProps> = ({
  metadata,
  coverage,
  loading = false,
}) => {
  if (loading || !metadata || !coverage) {
    return null;
  }

  const isComplete = coverage.matchedPeriods === coverage.expectedPeriods;
  const isPartial = coverage.matchedPeriods > 0 && coverage.matchedPeriods < coverage.expectedPeriods;

  return (
    <div className="bg-white rounded-lg border border-surface-border p-4 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-start md:items-center gap-3">
        <div className="p-2 rounded-md bg-slate-100 text-slate-700 flex-shrink-0">
          <Database className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-900">
              Source: {metadata.source} (FUELHH & WINDFOR)
            </span>
            {isComplete ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" /> Complete Data Coverage · {coverage.matchedPeriods}/{coverage.expectedPeriods} periods
              </span>
            ) : isPartial ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3 h-3" /> Partial Data Coverage · {coverage.matchedPeriods}/{coverage.expectedPeriods} periods
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                <AlertTriangle className="w-3 h-3" /> No Matched Data · 0/{coverage.expectedPeriods} periods
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500 mt-0.5">
            As-of cutoff selection applied at <strong className="text-slate-700">{metadata.cutoffTime} {metadata.timezone}</strong>.
            {isPartial && (
              <span className="ml-1 text-slate-600">
                Hourly WINDFOR stream matched with half-hourly settlement periods. Missing periods are preserved as null.
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 flex-shrink-0 self-start md:self-auto border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
        <div className="flex items-center gap-1.5" title="Timestamp when data was retrieved from Elexon BMRS">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Retrieved: {formatDateTimeLondon(metadata.dataRetrievedAt)}</span>
        </div>
        <div className="flex items-center gap-1.5" title={metadata.assumptions.join(' ')}>
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Assumptions: {metadata.assumptions.length} active</span>
        </div>
      </div>
    </div>
  );
};
