import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApiQuery, getApiBaseUrl } from '../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeeklyPlan {
  week: number;
  focus: string;
  objectives: string[];
  activities: string[];
}

interface ImprovementPlan {
  summary: string;
  keyConcerns: string[];
  weeklyRoadmap: WeeklyPlan[];
  parentCommunicationDraft: string;
  healthScoreAtGeneration: number | null;
  riskLevelAtGeneration: string | null;
}

interface SessionData {
  id: string;
  title: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  words_per_minute: number | null;
  transcript: string | null;
  error_rate: number | null;
  total_words_read: number | null;
  total_errors: number | null;
}

interface ReportData {
  session: SessionData;
  improvementPlan: ImprovementPlan | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ParentSessionReport() {
  const { studentId, sessionId } = useParams();
  const { data, loading, error } = useApiQuery<ReportData>(
    `/parent/children/${studentId}/sessions/${sessionId}/report`
  );

  const [ttsState, setTtsState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // ── TTS Playback ──────────────────────────────────────────────────────
  const handleListenClick = async () => {
    // If already playing, stop
    if (ttsState === 'playing') {
      window.speechSynthesis.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setTtsState('idle');
      return;
    }

    setTtsState('loading');

    try {
      const baseUrl = getApiBaseUrl();
      const endpoint = `/api/v1/parent/children/${studentId}/sessions/${sessionId}/tts-playback`;
      const targetUrl = baseUrl ? `${baseUrl}${endpoint}` : endpoint;

      const response = await fetch(targetUrl, { credentials: 'include' });

      if (!response.ok) {
        throw new Error(`TTS request failed (${response.status})`);
      }

      const contentType = response.headers.get('Content-Type') || '';

      if (contentType.includes('audio/')) {
        // OpenAI TTS succeeded — play the audio buffer
        const blob = await response.blob();
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setTtsState('idle');
        audio.onerror = () => setTtsState('error');
        setTtsState('playing');
        await audio.play();
      } else {
        // Browser TTS fallback — same pattern as PracticePage.tsx playWordAudio()
        const json = await response.json();
        if (json.useBrowserTts && json.transcript) {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(json.transcript);
            utterance.rate = 0.85;
            utterance.pitch = 1.0;
            utterance.onend = () => setTtsState('idle');
            utterance.onerror = () => setTtsState('error');
            setTtsState('playing');
            window.speechSynthesis.speak(utterance);
          } else {
            setTtsState('error');
          }
        } else {
          setTtsState('error');
        }
      }
    } catch (err) {
      console.error('TTS playback error:', err);
      setTtsState('error');
    }
  };

  // ── Loading / Error states ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 text-center text-on-surface-variant font-body">
        Loading session report...
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8 text-center text-error font-body">
        Error: {error.message}
      </div>
    );
  }
  if (!data?.session) {
    return (
      <div className="p-8 text-center text-on-surface-variant font-body">
        No session report found.
      </div>
    );
  }

  const { session, improvementPlan } = data;
  const displayWpm = session.words_per_minute != null ? Math.round(session.words_per_minute) : null;
  const accuracyPct = 100 - Math.round((session.error_rate || 0) * 100);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <main className="w-full max-w-max-content-width mx-auto px-container-padding py-8 space-y-8 pb-24 text-on-surface">
      {/* Sub-header */}
      <div className="space-y-4">
        <Link
          to="/parent/home"
          className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary font-display text-sm font-bold tracking-[0.08em] transition-all group w-fit"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Back to Parent Dashboard
        </Link>
        <div>
          <h1 className="font-display text-[28px] sm:text-[36px] md:text-[48px] leading-[1.2] tracking-[0.02em] font-extrabold text-on-surface mb-2">
            Reading Report
          </h1>
          <p className="font-body text-[16px] sm:text-[20px] leading-[1.6] tracking-[0.05em] text-on-surface-variant flex flex-wrap items-center gap-2">
            <span className="material-symbols-outlined text-outline">description</span>
            Passage: <span className="font-medium text-on-surface">{session.title || 'Untitled Passage'}</span>
          </p>
          {session.started_at && (
            <p className="font-body text-sm text-on-surface-variant mt-1">
              {new Date(session.started_at).toLocaleDateString(undefined, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>

      {/* Listen to Reading — TTS Button */}
      <div className="glass-card rounded-3xl p-6 border border-primary/20 bg-primary-fixed/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-2xl">graphic_eq</span>
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-on-surface">Listen to This Reading</h3>
            <p className="font-body text-xs text-on-surface-variant">
              AI-synthesized voice playback of your child's reading transcript
            </p>
          </div>
        </div>
        <button
          onClick={() => void handleListenClick()}
          disabled={ttsState === 'loading'}
          className={`px-6 py-3 rounded-2xl font-display text-sm font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
            ttsState === 'playing'
              ? 'bg-error text-on-primary hover:bg-error/80'
              : ttsState === 'loading'
                ? 'bg-surface-container-high text-on-surface-variant animate-pulse'
                : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
          }`}
        >
          <span className="material-symbols-outlined text-xl">
            {ttsState === 'playing' ? 'stop' : ttsState === 'loading' ? 'hourglass_top' : 'play_arrow'}
          </span>
          {ttsState === 'playing' ? 'Stop Playback' : ttsState === 'loading' ? 'Generating…' : 'Play Reading'}
        </button>
      </div>
      {ttsState === 'error' && (
        <p className="text-sm text-error font-body text-center -mt-4">
          Unable to generate audio playback. Please try again later.
        </p>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-card-gap">
        <div className="glass-card rounded-3xl p-6 border border-white/80 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="h-14 w-14 rounded-2xl bg-primary-container/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-3xl">speed</span>
          </div>
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant mb-1">Speed</p>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-[28px] sm:text-[32px] font-bold text-primary">{displayWpm != null ? displayWpm : '—'}</span>
              <span className="font-body text-base text-outline">WPM</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-white/80 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="h-14 w-14 rounded-2xl bg-secondary-container/25 flex items-center justify-center text-secondary shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-3xl">menu_book</span>
          </div>
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant mb-1">Words Read</p>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-[28px] sm:text-[32px] font-bold text-primary">{session.total_words_read ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-3xl p-6 border border-white/80 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-200 sm:col-span-2 md:col-span-1">
          <div className="h-14 w-14 rounded-2xl bg-tertiary-container/25 flex items-center justify-center text-tertiary-container shrink-0 shadow-inner">
            <span className="material-symbols-outlined text-3xl">check_circle</span>
          </div>
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant mb-1">Accuracy</p>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-[28px] sm:text-[32px] font-bold text-primary">{accuracyPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Improvement Plan Section */}
      {improvementPlan && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-sm">
            <div className="flex items-start gap-4 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-secondary-container/20 flex items-center justify-center text-secondary shrink-0 mt-1 shadow-inner">
                <span className="material-symbols-outlined text-2xl">psychology</span>
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-on-surface mb-1">Improvement Plan</h2>
                {improvementPlan.healthScoreAtGeneration != null && (
                  <span className="inline-block px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary-container/20 text-primary">
                    Health Score: {improvementPlan.healthScoreAtGeneration}/100
                    {improvementPlan.riskLevelAtGeneration && ` • ${improvementPlan.riskLevelAtGeneration}`}
                  </span>
                )}
              </div>
            </div>
            <p className="font-body text-sm text-on-surface leading-relaxed">{improvementPlan.summary}</p>
          </div>

          {/* Key Concerns */}
          {improvementPlan.keyConcerns.length > 0 && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-sm">
              <h3 className="font-display text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600">warning</span>
                Key Concerns
              </h3>
              <ul className="space-y-2">
                {improvementPlan.keyConcerns.map((concern, i) => (
                  <li key={i} className="font-body text-sm text-on-surface flex items-start gap-2 p-3 rounded-xl bg-white/40 border border-surface-container-highest">
                    <span className="material-symbols-outlined text-amber-600 text-sm mt-0.5 shrink-0">arrow_right</span>
                    {concern}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weekly Roadmap */}
          {improvementPlan.weeklyRoadmap.length > 0 && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-sm">
              <h3 className="font-display text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                4-Week Improvement Roadmap
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {improvementPlan.weeklyRoadmap.map((week) => (
                  <div key={week.week} className="p-4 rounded-2xl bg-white/40 border border-surface-container-highest">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-on-primary font-display text-xs font-bold">
                        {week.week}
                      </span>
                      <h4 className="font-display text-sm font-bold text-on-surface">{week.focus}</h4>
                    </div>
                    <ul className="space-y-1">
                      {week.objectives.map((obj, i) => (
                        <li key={i} className="font-body text-xs text-on-surface-variant flex items-start gap-1.5">
                          <span className="material-symbols-outlined text-primary text-xs mt-0.5 shrink-0">check</span>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parent Communication Draft */}
          {improvementPlan.parentCommunicationDraft && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-sm">
              <h3 className="font-display text-lg font-bold text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">mail</span>
                Teacher Communication
              </h3>
              <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-surface-container-highest font-body text-sm text-on-surface leading-relaxed whitespace-pre-line">
                {improvementPlan.parentCommunicationDraft}
              </div>
            </div>
          )}
        </div>
      )}

      {/* No plan available */}
      {!improvementPlan && (
        <div className="glass-card rounded-3xl p-8 text-center border border-white/80 text-on-surface-variant font-body shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-4xl">info</span>
          </div>
          <h3 className="font-display text-lg font-bold text-on-surface mb-1">Improvement Plan Pending</h3>
          <p className="font-body text-sm text-on-surface-variant">
            An improvement plan will be generated once enough session data is available.
          </p>
        </div>
      )}
    </main>
  );
}
