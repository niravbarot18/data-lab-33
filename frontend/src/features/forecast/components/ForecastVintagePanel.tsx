import React from 'react';
import { Layers, CheckCircle2, Clock } from 'lucide-react';
import type { ForecastActualPoint, AnalysisMetadata } from '../../../types/forecast';
import { Card, CardHeader, CardTitle, CardBody } from '../../../components/ui/Card';
import { formatSettlementWindow, formatDateTimeLondon } from '../../../utils/date';
import { formatMw, formatSignedErrorMw } from '../../../utils/format';

interface ForecastVintagePanelProps {
  selectedPoint: ForecastActualPoint | null;
  metadata?: AnalysisMetadata;
  onClearSelection: () => void;
}

export const ForecastVintagePanel: React.FC<ForecastVintagePanelProps> = ({
  selectedPoint,
  metadata,
  onClearSelection,
}) => {
  if (!selectedPoint) {
    return null;
  }

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-blue-50/50">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-forecast" />
          <CardTitle>Forecast Selection Inspector: {formatSettlementWindow(selectedPoint.deliveryStart)}</CardTitle>
        </div>
        <button
          onClick={onClearSelection}
          className="text-xs text-slate-500 hover:text-slate-800 underline"
        >
          Close Inspector
        </button>
      </CardHeader>
      <CardBody className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-3 rounded border border-slate-200">
            <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px] block mb-1">
              Selected As-Of Vintage
            </span>
            <div className="text-base font-bold text-blue-700 font-mono">
              {formatMw(selectedPoint.forecastGenerationMw)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              Published: {formatDateTimeLondon(selectedPoint.forecastPublishedAt)}
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-slate-200">
            <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px] block mb-1">
              Actual Outturn (FUELHH)
            </span>
            <div className="text-base font-bold text-teal-700 font-mono">
              {formatMw(selectedPoint.actualGenerationMw)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Signed Miss: <strong className="font-mono">{formatSignedErrorMw(selectedPoint.signedErrorMw)}</strong>
            </div>
          </div>

          <div className="bg-white p-3 rounded border border-slate-200">
            <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px] block mb-1">
              As-Of Selection Rule
            </span>
            <div className="text-[11px] text-slate-700 flex items-start gap-1.5 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                Selected the latest official Elexon WINDFOR vintage published on or before{' '}
                <strong>{metadata?.cutoffTime} {metadata?.timezone}</strong>. Vintages published after cutoff were excluded.
              </span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
