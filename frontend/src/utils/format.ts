/**
 * Numeric and generation metric formatting utilities.
 */

export function formatMw(val: number | null | undefined, showUnit: boolean = true): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '—';
  }
  const formatted = new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(val);

  return showUnit ? `${formatted} MW` : formatted;
}

export function formatSignedErrorMw(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) {
    return '—';
  }
  const sign = val > 0 ? '+' : '';
  const formatted = new Intl.NumberFormat('en-GB', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(val);

  return `${sign}${formatted} MW`;
}

export function formatPercentage(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined || isNaN(ratio)) {
    return '—';
  }
  return `${(ratio * 100).toFixed(1)}%`;
}
