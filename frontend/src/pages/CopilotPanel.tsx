import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch, useApiQuery } from '../lib/api';

export default function CopilotPanel() {
  const { studentId } = useParams();
  const [strategy, setStrategy] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: studentData } = useApiQuery<any>(`/teacher/students/${studentId}/trends`);
  const { data: healthData } = useApiQuery<any>(`/health-score/${studentId}`);
  const { data: screeningData } = useApiQuery<any>(`/risk-screening/${studentId}`);
  const { data: historyData } = useApiQuery<any>(`/copilot/${studentId}/history`);

  const healthScore = healthData?.healthScore;
  const screening = screeningData?.screening;
  const history = historyData?.history || [];

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await apiFetch<any>(`/copilot/${studentId}/strategy`, { method: 'POST' });
      setStrategy(res.strategy);
    } catch (err: any) {
      setError(err.message || 'Failed to generate strategy');
    } finally {
      setGenerating(false);
    }
  };

  const riskColorMap: Record<string, string> = {
    low: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    medium: 'bg-amber-100 text-amber-800 border-amber-300',
    high: 'bg-red-100 text-red-800 border-red-300',
  };

  const healthColorMap: Record<string, string> = {
    excellent: 'text-emerald-600',
    good: 'text-green-600',
    medium: 'text-amber-600',
    high: 'text-orange-600',
    critical: 'text-red-600',
  };

  return (
    <main className="flex-grow w-full max-w-max-content-width mx-auto px-container-padding py-8 sm:py-12 text-on-surface">
      <Link to="/teacher/dashboard" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary font-display text-sm font-bold tracking-[0.08em] uppercase transition-all group mb-6">
        <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
        Back to Classroom
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/20 text-primary font-display text-[10px] font-bold uppercase tracking-widest mb-2">
            <span className="material-symbols-outlined text-sm">smart_toy</span>
            Decodex Copilot
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-on-surface">AI Intervention Copilot</h1>
          <p className="font-body text-base text-on-surface-variant mt-1">Generate a comprehensive intervention strategy</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="h-14 px-8 rounded-2xl bg-primary text-on-primary font-display text-base font-bold uppercase tracking-[0.06em] transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-60 flex items-center gap-3 cursor-pointer whitespace-nowrap"
        >
          <span className="material-symbols-outlined">{generating ? 'hourglass_top' : 'neurology'}</span>
          {generating ? 'Generating Strategy…' : 'Generate Strategy'}
        </button>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass-card rounded-2xl p-4 border border-white/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">favorite</span>
          </div>
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Health Score</p>
            {healthScore ? (
              <p className={`font-display text-2xl font-extrabold ${healthColorMap[healthScore.riskLevel] || 'text-primary'}`}>
                {healthScore.score}/100
              </p>
            ) : (
              <p className="font-body text-sm text-on-surface-variant">Not computed</p>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary-container/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary">shield</span>
          </div>
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Risk Screening</p>
            {screening ? (
              <span className={`inline-block px-3 py-0.5 rounded-full text-xs font-bold border ${riskColorMap[screening.risk] || ''}`}>
                {screening.risk.toUpperCase()} ({screening.confidence}% conf.)
              </span>
            ) : (
              <p className="font-body text-sm text-on-surface-variant">Not screened</p>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-white/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">history</span>
          </div>
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Previous Strategies</p>
            <p className="font-display text-2xl font-extrabold text-primary">{history.length}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 mb-6 text-red-800 font-body text-sm">{error}</div>
      )}

      {/* Strategy Output */}
      {strategy && (
        <div className="space-y-6 animate-in fade-in">
          {/* Summary */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>summarize</span>
              </div>
              <h2 className="font-display text-xl font-bold text-on-surface">Strategy Summary</h2>
            </div>
            <p className="font-body text-base text-on-surface leading-relaxed">{strategy.summary}</p>
          </div>

          {/* Key Concerns */}
          {strategy.keyConcerns?.length > 0 && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-700" style={{fontVariationSettings: "'FILL' 1"}}>warning</span>
                </div>
                <h2 className="font-display text-xl font-bold text-on-surface">Key Concerns</h2>
              </div>
              <ul className="space-y-2">
                {strategy.keyConcerns.map((concern: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-200/50">
                    <span className="material-symbols-outlined text-amber-600 mt-0.5 shrink-0 text-sm">priority_high</span>
                    <span className="font-body text-sm text-on-surface">{concern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weekly Roadmap */}
          {strategy.weeklyRoadmap?.length > 0 && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{fontVariationSettings: "'FILL' 1"}}>calendar_month</span>
                </div>
                <h2 className="font-display text-xl font-bold text-on-surface">4-Week Intervention Roadmap</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {strategy.weeklyRoadmap.map((week: any) => (
                  <div key={week.week} className="rounded-2xl border border-surface-variant p-5 bg-white/30 hover:bg-white/50 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-on-primary font-display text-xs font-bold">{week.week}</span>
                      <h3 className="font-display text-sm font-bold text-on-surface">{week.focus}</h3>
                    </div>
                    <ul className="space-y-1.5 mb-3">
                      {week.objectives?.map((obj: string, i: number) => (
                        <li key={i} className="font-body text-xs text-on-surface-variant flex items-start gap-1.5">
                          <span className="material-symbols-outlined text-primary text-[12px] mt-0.5 shrink-0">check_circle</span>
                          {obj}
                        </li>
                      ))}
                    </ul>
                    <div className="border-t border-surface-variant pt-2">
                      <p className="font-display text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Activities</p>
                      {week.activities?.map((act: string, i: number) => (
                        <span key={i} className="inline-block px-2 py-0.5 rounded-md bg-primary-container/15 text-primary font-body text-[10px] mr-1 mb-1">{act}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Exercises */}
          {strategy.recommendedExercises?.length > 0 && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-700" style={{fontVariationSettings: "'FILL' 1"}}>fitness_center</span>
                </div>
                <h2 className="font-display text-xl font-bold text-on-surface">Recommended Exercises</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {strategy.recommendedExercises.map((ex: any, i: number) => (
                  <div key={i} className="rounded-xl border border-surface-variant p-4 bg-white/20 flex items-start gap-3">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-display text-xs font-bold shrink-0">{ex.category}</span>
                    <div>
                      <p className="font-display text-sm font-bold text-on-surface">{ex.name}</p>
                      <p className="font-body text-xs text-on-surface-variant mt-0.5">{ex.description}</p>
                      <p className="font-body text-[10px] text-on-surface-variant mt-1">~{ex.estimatedMinutes} min • {ex.difficulty}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parent Communication Draft */}
          {strategy.parentCommunicationDraft && (
            <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-700" style={{fontVariationSettings: "'FILL' 1"}}>mail</span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-on-surface">Parent Communication Draft</h2>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(strategy.parentCommunicationDraft)}
                  className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface font-display text-xs font-bold uppercase tracking-wider hover:bg-surface-container-highest transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  Copy
                </button>
              </div>
              <pre className="font-body text-sm text-on-surface whitespace-pre-wrap leading-relaxed bg-white/40 rounded-xl p-5 border border-surface-variant">{strategy.parentCommunicationDraft}</pre>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!strategy && !generating && (
        <div className="glass-card rounded-3xl p-12 border border-white/80 text-center shadow-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary-container/20 flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-5xl text-primary" style={{fontVariationSettings: "'FILL' 1"}}>neurology</span>
          </div>
          <h3 className="font-display text-2xl font-bold text-on-surface mb-2">Ready to Generate</h3>
          <p className="font-body text-base text-on-surface-variant max-w-md mx-auto">
            Click "Generate Strategy" to create a comprehensive intervention plan including weekly roadmaps, recommended exercises, and a parent communication draft.
          </p>
        </div>
      )}
    </main>
  );
}
