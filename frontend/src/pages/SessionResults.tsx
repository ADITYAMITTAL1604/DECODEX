import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApiQuery } from '../lib/api';
import AnnotatedText from '../components/AnnotatedText';
import DrillCard from '../components/DrillCard';

export default function SessionResults() {
  const { id } = useParams();
  const { data, loading, error } = useApiQuery<any>(`/sessions/${id}/results`);

  if (loading) return <div className="p-8 text-center text-on-surface-variant font-body">Loading results...</div>;
  if (error) return <div className="p-8 text-center text-error font-body">Error: {error.message}</div>;
  if (!data || !data.session) return <div className="p-8 text-center text-on-surface-variant font-body">No session results found.</div>;

  const { session, classifications = [], drills = [] } = data;
  const drill = Array.isArray(drills) && drills.length > 0 ? drills[0] : null;

  // Retrieve temporary in-memory audio playback URL (cleared on window close)
  const tempAudioUrl = id ? sessionStorage.getItem(`temp_audio_${id}`) : null;

  // Use the real computed WPM from the session record.
  const displayWpm = session.words_per_minute != null
    ? Math.round(session.words_per_minute)
    : null;

  const accuracyPct = 100 - Math.round((session.error_rate || 0) * 100);

  return (
    <main className="w-full max-w-max-content-width mx-auto px-container-padding py-8 space-y-8 pb-24 text-on-surface">
      {/* Sub-header Area */}
      <div className="space-y-4">
        <Link to="/" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary font-display text-sm font-bold tracking-[0.08em] transition-all group w-fit">
          <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Back to Dashboard
        </Link>
        <div>
          <h1 className="font-display text-[28px] sm:text-[36px] md:text-[48px] leading-[1.2] tracking-[0.02em] font-extrabold text-on-surface mb-2">Reading Results</h1>
          <p className="font-body text-[16px] sm:text-[20px] leading-[1.6] tracking-[0.05em] text-on-surface-variant flex flex-wrap items-center gap-2">
            <span className="material-symbols-outlined text-outline">description</span>
            Passage: <span className="font-medium text-on-surface">{session.title || 'Untitled Passage'}</span>
          </p>
        </div>
      </div>

      {/* Temporary Session Audio Playback (In-Memory Only) */}
      {tempAudioUrl ? (
        <div className="glass-card rounded-3xl p-6 border border-primary/20 bg-primary-fixed/30 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-2xl">graphic_eq</span>
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-on-surface">Session Audio Playback</h3>
              <p className="font-body text-xs text-on-surface-variant">Temporary recording playback • Automatically deleted when window is closed</p>
            </div>
          </div>
          <audio controls src={tempAudioUrl} className="w-full sm:w-80 h-10 outline-none rounded-xl" />
        </div>
      ) : null}

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl border border-white/80 shadow-sm bg-white/40 relative">
            <div className="px-6 sm:px-8 py-5 border-b border-white/60 bg-white/20 backdrop-blur-md flex justify-between items-center rounded-t-3xl">
              <h2 className="font-display text-[20px] sm:text-[24px] font-bold text-on-surface">Diagnostic View</h2>
            </div>
            
            <div className="px-6 sm:px-8 md:px-10 py-6 sm:py-10 bg-transparent">
              <AnnotatedText sessionId={session.id} originalText={session.original_passage || ''} classifications={classifications} />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 px-6 py-4 bg-white/30 backdrop-blur-md rounded-2xl border border-white/60 border-dashed">
            <span className="font-body text-xs sm:text-sm font-bold text-on-surface-variant mr-2">Error Types:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#d1fae5] border border-[#10b981]"></div>
              <span className="font-body text-xs sm:text-sm text-on-surface-variant">Omission</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#ffedd5] border border-[#f97316]"></div>
              <span className="font-body text-xs sm:text-sm text-on-surface-variant">Insertion</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#fef08a] border border-[#eab308]"></div>
              <span className="font-body text-xs sm:text-sm text-on-surface-variant">Substitution</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#e9d5ff] border border-[#a855f7]"></div>
              <span className="font-body text-xs sm:text-sm text-on-surface-variant">Reversal</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#bae6fd] border border-[#0ea5e9]"></div>
              <span className="font-body text-xs sm:text-sm text-on-surface-variant">Uncertain</span>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
          {drill ? (
            <div className="glass-card rounded-3xl p-6 border border-white/80 shadow-sm flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-tertiary-container/15 flex items-center justify-center text-tertiary-container shrink-0 mt-1 shadow-inner">
                  <span className="material-symbols-outlined text-2xl">neurology</span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-on-surface mb-1">Recommended Practice</h3>
                  <p className="font-body text-sm text-on-surface-variant leading-relaxed">Based on this assessment, AI suggests focusing on specific phoneme patterns.</p>
                </div>
              </div>
              <DrillCard drill={drill} />
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-8 text-center border border-white/80 text-on-surface-variant font-body shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-4xl">emoji_events</span>
              </div>
              <h3 className="font-display text-lg font-bold text-on-surface mb-1">Great Job!</h3>
              <p className="font-body text-sm text-on-surface-variant">No specific drills recommended for this session.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
