import React, { useState, useMemo, useEffect } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { ForecastActualPoint } from '../../../types/forecast';
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from '../../../components/ui/Card';
import { formatSettlementWindow, formatDateTimeLondon } from '../../../utils/date';
import { formatMw, formatSignedErrorMw } from '../../../utils/format';

interface DeliveryPeriodTableProps {
  points: ForecastActualPoint[];
  selectedPeriodStart?: string | null;
  onSelectPeriod?: (periodStart: string | null) => void;
}

type SortField = 'deliveryStart' | 'absoluteErrorMw' | 'signedErrorMw' | 'actualGenerationMw' | 'forecastGenerationMw';
type SortDirection = 'asc' | 'desc';

export const DeliveryPeriodTable: React.FC<DeliveryPeriodTableProps> = ({
  points,
  selectedPeriodStart,
  onSelectPeriod,
}) => {
  const [sortField, setSortField] = useState<SortField>('deliveryStart');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState<number>(12); // Default to 12 (4 clean 6-hour blocks for a 48-period day)
  const [currentPage, setCurrentPage] = useState<number>(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'absoluteErrorMw' ? 'desc' : 'asc');
    }
    setCurrentPage(1);
  };

  const handleFilterChange = (filter: string) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const filteredAndSortedPoints = useMemo(() => {
    let result = [...points];

    if (statusFilter !== 'all') {
      result = result.filter((p) => p.status === statusFilter);
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle nulls: always put nulls at the end
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      const numA = aVal as number;
      const numB = bVal as number;
      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    return result;
  }, [points, sortField, sortDirection, statusFilter]);

  const totalItems = filteredAndSortedPoints.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // If a period is selected from charts, navigate to the page containing that period
  useEffect(() => {
    if (selectedPeriodStart) {
      const index = filteredAndSortedPoints.findIndex((p) => p.deliveryStart === selectedPeriodStart);
      if (index !== -1) {
        const targetPage = Math.floor(index / pageSize) + 1;
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
      }
    }
  }, [selectedPeriodStart, filteredAndSortedPoints, pageSize]);

  // Ensure currentPage is within bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Paginated slice
  const paginatedPoints = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedPoints.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedPoints, currentPage, pageSize]);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-forecast ml-1 inline" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-forecast ml-1 inline" />
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'matched':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Matched
          </span>
        );
      case 'missing_forecast':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            Missing Forecast
          </span>
        );
      case 'missing_actual':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            Missing Actual
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Missing Both
          </span>
        );
    }
  };

  return (
    <Card className="mb-8 overflow-hidden shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle>Delivery Period Details</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Half-hourly settlement periods for the delivery date. Click any row to highlight on charts.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            aria-label="Filter periods by status"
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-forecast"
          >
            <option value="all">All Periods ({points.length})</option>
            <option value="matched">Matched Only</option>
            <option value="missing_forecast">Missing Forecast</option>
            <option value="missing_actual">Missing Actual</option>
          </select>
        </div>
      </CardHeader>

      <CardBody className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-surface-border text-slate-600 font-semibold uppercase tracking-wider">
                <th
                  onClick={() => handleSort('deliveryStart')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  Delivery Period {renderSortIndicator('deliveryStart')}
                </th>
                <th
                  onClick={() => handleSort('forecastGenerationMw')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  Selected Forecast {renderSortIndicator('forecastGenerationMw')}
                </th>
                <th
                  onClick={() => handleSort('actualGenerationMw')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  Actual Generation {renderSortIndicator('actualGenerationMw')}
                </th>
                <th
                  onClick={() => handleSort('signedErrorMw')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  Signed Error {renderSortIndicator('signedErrorMw')}
                </th>
                <th
                  onClick={() => handleSort('absoluteErrorMw')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors text-right"
                >
                  Absolute Error {renderSortIndicator('absoluteErrorMw')}
                </th>
                <th className="px-4 py-3 text-left">Forecast Published At</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedPoints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No periods match the selected filter.
                  </td>
                </tr>
              ) : (
                paginatedPoints.map((pt) => {
                  const isSelected = pt.deliveryStart === selectedPeriodStart;
                  const isLargeError = pt.absoluteErrorMw !== null && pt.absoluteErrorMw >= 1000;

                  return (
                    <tr
                      key={pt.deliveryStart}
                      onClick={() => onSelectPeriod?.(isSelected ? null : pt.deliveryStart)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-50/70 border-l-4 border-amber-500 font-medium'
                          : isLargeError
                          ? 'bg-amber-50/20 hover:bg-slate-50'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                        {formatSettlementWindow(pt.deliveryStart)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-blue-700 whitespace-nowrap">
                        {formatMw(pt.forecastGenerationMw)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-teal-700 whitespace-nowrap">
                        {formatMw(pt.actualGenerationMw)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">
                        {pt.signedErrorMw !== null ? (
                          <span
                            className={
                              pt.signedErrorMw > 0
                                ? 'text-blue-600 font-semibold'
                                : pt.signedErrorMw < 0
                                ? 'text-teal-700 font-semibold'
                                : 'text-slate-600'
                            }
                          >
                            {formatSignedErrorMw(pt.signedErrorMw)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono whitespace-nowrap">
                        {pt.absoluteErrorMw !== null ? (
                          <span className={isLargeError ? 'font-bold text-amber-700' : 'text-slate-800'}>
                            {formatMw(pt.absoluteErrorMw)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-[11px] whitespace-nowrap font-mono">
                        {formatDateTimeLondon(pt.forecastPublishedAt)}
                      </td>
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        {getStatusBadge(pt.status)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CardBody>

      {/* Pagination Footer */}
      {totalItems > 0 && (
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="font-semibold text-slate-900">{startItem}</strong> to{' '}
              <strong className="font-semibold text-slate-900">{endItem}</strong> of{' '}
              <strong className="font-semibold text-slate-900">{totalItems}</strong> periods
            </span>

            <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
              <span className="text-slate-500">Per page:</span>
              <select
                aria-label="Rows per page"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded px-2 py-1 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-forecast"
              >
                <option value={10}>10</option>
                <option value={12}>12 (6 hrs)</option>
                <option value={24}>24 (12 hrs)</option>
                <option value={48}>48 (All)</option>
              </select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                aria-label="First page"
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isActive = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[28px] h-7 px-2 rounded font-medium text-xs transition-colors ${
                        isActive
                          ? 'bg-forecast text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                aria-label="Last page"
                className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 transition-colors"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
};
