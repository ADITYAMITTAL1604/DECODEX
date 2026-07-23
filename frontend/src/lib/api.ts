import { useState, useEffect } from 'react';

export interface ApiError extends Error {
  code?: string;
  details?: Record<string, unknown>;
}

function getApiBaseUrl(): string {
  let raw = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!raw) return '';
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }
  return raw.replace(/\/$/, '');
}

const API_BASE = getApiBaseUrl();

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = API_BASE ? `${API_BASE}/api/v1${cleanEndpoint}` : `/api/v1${cleanEndpoint}`;
  
  const token = localStorage.getItem('decodex_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (data?.token) {
      localStorage.setItem('decodex_token', data.token);
    }

    if (response.status === 401) {
      localStorage.removeItem('decodex_token');
      window.dispatchEvent(new Event('auth:expired'));
    }

    if (!response.ok) {
      const error = new Error(data?.error?.message || `HTTP error ${response.status}`) as ApiError;
      error.code = data?.error?.code;
      error.details = data?.error?.details;
      throw error;
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof TypeError && err.message.toLowerCase().includes('url')) {
      console.error('API Fetch URL Error:', url, err);
      throw new Error(`API Connection Failed: Unable to reach backend at ${url || 'server'}. Check VITE_API_BASE_URL.`);
    }
    throw err;
  }
}

export function useApiQuery<T>(endpoint: string, options?: RequestInit) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!endpoint.includes('/skip'));
  const [error, setError] = useState<Error | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!endpoint || endpoint.includes('/skip')) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    
    apiFetch<T>(endpoint, { ...options, signal: controller.signal })
      .then(setData)
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [endpoint, key]);

  return { data, loading, error, refetch: () => setKey(k => k + 1) };
}
