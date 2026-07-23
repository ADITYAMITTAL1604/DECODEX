import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch, useApiQuery, getApiBaseUrl } from '../lib/api';
import { useSessionSSE } from '../hooks/useSessionSSE';
import AudioRecorder from '../components/AudioRecorder';

export default function SessionActive() {
  const { id: passageId } = useParams();
  const navigate = useNavigate();
  const { data: passageData, loading: passageLoading } = useApiQuery<{ passage: any }>(`/passages/${passageId}`);
  const { data: consentStatus, loading: consentLoading } = useApiQuery<{ consent_granted: boolean }>('/students/me/consent-status');
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { status, setStatus } = useSessionSSE(sessionId);

  useEffect(() => {
    // Automatically create a session when they land on this page
    if (passageId && !sessionId) {
      apiFetch<{ session: any }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ passage_id: passageId })
      }).then(res => setSessionId(res.session.id))
        .catch(err => console.error("Failed to create session", err));
    }
  }, [passageId]);

  const handleRecordingComplete = async (blob: Blob) => {
    if (!sessionId) return;
    
    // Store temporary in-memory URL for immediate playback on Results page (cleared on window close)
    try {
      const tempUrl = URL.createObjectURL(blob);
      sessionStorage.setItem(`temp_audio_${sessionId}`, tempUrl);
    } catch (e) {
      console.warn('Could not store temporary audio blob URL:', e);
    }

    setStatus({ step: 'uploading', message: 'Uploading audio...' });
    
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    
    try {
      // Build absolute URL for deployed environments (Vercel → Render, etc.)
      const baseUrl = getApiBaseUrl();
      const uploadUrl = `${baseUrl}/api/v1/sessions/${sessionId}/audio`;
      const token = localStorage.getItem('decodex_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      setStatus({ step: 'queued', message: 'Audio queued for processing...' });
    } catch (err) {
      setStatus({ step: 'error', message: 'Failed to upload audio' });
    }
  };

  // If processing completes, navigate to results page (Block 5)
  useEffect(() => {
    if (status.step === 'complete') {
      setTimeout(() => navigate(`/sessions/${sessionId}/results`), 2000);
    }
  }, [status.step, sessionId, navigate]);

  if (passageLoading) return <div className="p-8 text-center">Loading passage...</div>;

  return (
    <main className="flex-1 w-full max-w-[1024px] mx-auto px-container-padding flex flex-col items-center justify-center gap-card-gap pb-12 mt-4 md:mt-12">
      <article className="bg-surface-container-lowest w-full rounded-[24px] p-8 md:p-12 shadow-[0_4px_16px_rgba(45,41,38,0.05)] flex flex-col gap-6 max-w-3xl">
        <h1 className="font-display text-[32px] leading-[1.3] font-bold text-primary text-center mb-4">{passageData?.passage.title || 'Reading Exercise'}</h1>
        <div className="font-body text-[20px] leading-[1.6] text-on-surface flex flex-col gap-6 tracking-[0.05em]">
          <p className="transition-all duration-300">
            {passageData?.passage.content}
          </p>
        </div>
      </article>

      <div className="flex flex-col items-center gap-4 mt-8 relative w-full max-w-md">
        {(status.step === 'idle' || status.step === 'error') ? (
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            disabled={consentLoading || !consentStatus?.consent_granted}
            disabledMessage={consentLoading ? 'Checking parent consent before recording can begin.' : 'Recording is locked until a parent confirms consent.'}
          />
        ) : (
          <div className="w-full max-w-3xl mt-4 mb-8 bg-surface-container-low p-6 rounded-[24px] shadow-[0_4px_16px_rgba(45,41,38,0.05)] border border-surface-container-highest">
            <div className="text-center flex flex-col items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <h3 className="text-lg font-bold font-display text-primary">{status.message}</h3>
              <p className="font-body text-sm text-on-surface-variant mt-2 uppercase tracking-[0.08em]">Step: {status.step}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
