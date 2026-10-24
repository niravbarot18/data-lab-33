/**
 * Date and time formatting utilities with Europe/London and UTC awareness.
 * Displays dates uniformly in DD/MM/YYYY format throughout the user interface.
 */

export function formatDdMmYyyy(isoDateOrUtcStr: string | null | undefined): string {
  if (!isoDateOrUtcStr) return '—';
  const str = isoDateOrUtcStr.trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  try {
    const d = new Date(str);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoDateOrUtcStr;
  }
}

export function formatLondonTime(isoUtcStr: string): string {
  try {
    const d = new Date(isoUtcStr);
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return isoUtcStr;
  }
}

export function formatSettlementWindow(isoUtcStr: string): string {
  try {
    const start = new Date(isoUtcStr);
    const end = new Date(start.getTime() + 30 * 60 * 1000);
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${fmt.format(start)} - ${fmt.format(end)}`;
  } catch {
    return isoUtcStr;
  }
}

export function formatLondonDate(isoDateOrUtcStr: string): string {
  return formatDdMmYyyy(isoDateOrUtcStr);
}

export function formatDateTimeLondon(isoUtcStr: string | null): string {
  if (!isoUtcStr) return '—';
  try {
    const d = new Date(isoUtcStr);
    const dateFormatted = formatDdMmYyyy(isoUtcStr);
    const timeFormatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
    return `${dateFormatted}, ${timeFormatted} GMT`;
  } catch {
    return isoUtcStr;
  }
}
