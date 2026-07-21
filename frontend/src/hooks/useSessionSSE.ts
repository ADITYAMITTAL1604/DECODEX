import { useState, useEffect } from 'react';

export interface ProcessingStatus {
  step: 'idle' | 'uploading' | 'queued' | 'transcribing' | 'aligning' | 'saving' | 'complete' | 'error';
  message: string;
}

export function useSessionSSE(sessionId: string | null) {
  const [status, setStatus] = useState<ProcessingStatus>({ step: 'idle', message: 'Waiting to record...' });

  useEffect(() => {
    if (!sessionId) return;

    // Use EventSource for SSE. Note: Native EventSource doesn't support custom headers (like Authorization),
    // but our API relies on cookies which ARE sent automatically if we configure withCredentials.
    const eventSource = new EventSource(`/api/v1/sessions/${sessionId}/status/stream`, {
      withCredentials: true
    });

    eventSource.addEventListener('connected', (e) => {
      console.log('SSE Connected', JSON.parse(e.data));
    });

    eventSource.addEventListener('status', (e) => {
      const data = JSON.parse(e.data);
      setStatus({ step: data.step, message: data.message });
      
      if (data.step === 'complete') {
        eventSource.close();
      }
    });

    eventSource.addEventListener('error', (e: any) => {
      // In SSE, the 'error' event can mean the server dropped the connection, or it's a custom event we sent.
      if (e.data) {
        const data = JSON.parse(e.data);
        setStatus({ step: 'error', message: data.message || 'Processing failed.' });
      } else {
        // If it's just a network disconnect, EventSource auto-reconnects, but if we're done, we close it.
        if (status.step === 'complete') {
          eventSource.close();
        }
      }
    });

    return () => {
      eventSource.close();
    };
  }, [sessionId]);

  return { status, setStatus };
}
