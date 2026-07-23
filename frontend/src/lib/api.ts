import { useState, useEffect } from 'react';

export interface ApiError extends Error {
  code?: string;
  details?: Record<string, unknown>;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}/api/v1${endpoint}`;
  
  const token = localStorage.getItem('decodex_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  const data = await response.json();

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

  return data;
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
