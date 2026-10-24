import { AppApiError } from '../utils/errors';
import type { ApiErrorResponse } from '../types/forecast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export async function apiGet<T>(endpoint: string, params?: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const url = new URL(`${API_BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, val);
      }
    });
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      let errorData: ApiErrorResponse | null = null;
      try {
        errorData = await response.json();
      } catch {
        // Fallback if not valid JSON
      }

      const message = errorData?.error?.message || `Request failed with status ${response.status}`;
      const code = errorData?.error?.code || `HTTP_${response.status}`;
      throw new AppApiError(message, code, response.status);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (err instanceof AppApiError) {
      throw err;
    }
    throw new AppApiError((err as Error).message || 'Network request failed', 'NETWORK_ERROR', 0);
  }
}
