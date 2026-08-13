import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { apiFetch, useApiQuery, getApiBaseUrl } from '../lib/api';
import { useSessionSSE } from '../hooks/useSessionSSE';
import { useReadingPreferences } from '../hooks/useReadingPreferences';
import AudioRecorder from '../components/AudioRecorder';
import ReadingPreferencesPanel from '../components/ReadingPreferencesPanel';
import { Type } from 'lucide-react';

export default function SessionActive() {
  const { id: passageId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const existingSessionId = searchParams.get('sessionId');
  const { data: passageData, loading: passageLoading } = useApiQuery<{ passage: any }>(`/passages/${passageId}`);
  const { data: consentStatus, loading: consentLoading } = useApiQuery<{ consent_granted: boolean }>('/students/me/consent-status');
  const { preferences } = useReadingPreferences();
  const [prefsPanelOpen, setPrefsPanelOpen] = useState(false);
  
  const [sessionId, setSessionId] = useState<string | null>(existingSessionId);
  const { status, setStatus } = useSessionSSE(sessionId);

  useEffect(() => {
    if (existingSessionId) {
      setSessionId(existingSessionId);
      return;
    }

    // Automatically create a free-practice session when they land on this page.
    if (passageId && !sessionId) {
      apiFetch<{ session: any }>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ passage_id: passageId })
      }).then(res => setSessionId(res.session.id))
        .catch(err => console.error("Failed to create session", err));
    }
  }, [existingSessionId, passageId, sessionId]);

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

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      setStatus({ step: 'queued', message: 'Audio queued for processing...' });
    } catch {
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
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[32px] leading-[1.3] font-bold text-primary text-center mb-4">{passageData?.passage.title || 'Reading Exercise'}</h1>
          <button
            onClick={() => setPrefsPanelOpen(true)}
            className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high transition-colors"
            aria-label="Reading preferences"
          >
            <Type className="w-5 h-5" />
          </button>
        </div>
        <div className="font-body text-[20px] leading-[1.6] text-on-surface flex flex-col gap-6 tracking-[0.05em]">
          <p
            className="transition-all duration-300"
            style={{
              fontSize: `${20 * preferences.fontScale}px`,
              lineHeight: preferences.lineSpacing,
              letterSpacing: `${preferences.letterSpacing}em`,
            }}
          >
            {passageData?.passage.content}
          </p>
        </div>
      </article>

      <div className="flex flex-col items-center gap-4 mt-8 relative w-full max-w-md">
        {status.step === 'idle' ? (
          <AudioRecorder
            onRecordingComplete={handleRecordingComplete}
            disabled={consentLoading || !consentStatus?.consent_granted}
            disabledMessage={consentLoading ? 'Checking parent consent before recording can begin.' : 'Recording is locked until a parent confirms consent.'}
          />
        ) : status.step === 'error' ? (
          <div role="alert" className="w-full max-w-3xl mt-4 mb-8 bg-error-container p-6 rounded-[24px] shadow-[0_4px_16px_rgba(45,41,38,0.05)] border border-outline-variant">
            <div className="text-center flex flex-col items-center justify-center py-4">
              <span className="material-symbols-outlined text-4xl text-on-error-container" aria-hidden="true">error</span>
              <h3 className="text-lg font-bold font-display text-on-error-container mt-2">{status.message || 'Something went wrong'}</h3>
              <p className="font-body text-sm text-on-error-container mt-2">You can try recording again.</p>
              <button
                onClick={() => setStatus({ step: 'idle', message: 'Waiting to record...' })}
                className="mt-4 h-12 px-6 rounded-xl bg-primary font-body font-bold text-on-primary hover:bg-on-primary-fixed-variant"
              >
                Try again
              </button>
            </div>
          </div>
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
      <ReadingPreferencesPanel isOpen={prefsPanelOpen} onClose={() => setPrefsPanelOpen(false)} />
    </main>
  );
}
