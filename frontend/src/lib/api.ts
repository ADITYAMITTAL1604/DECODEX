import { useState, useEffect } from 'react';

export interface ApiError extends Error {
  code?: string;
  details?: Record<string, unknown>;
}

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `/api/v1${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Automatically sends httpOnly cookies (JWT)
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (response.status === 401) {
    // Optionally trigger a custom event or a callback to logout user
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
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
  }, [endpoint]);

  return { data, loading, error, refetch: () => setLoading(true) };
}
