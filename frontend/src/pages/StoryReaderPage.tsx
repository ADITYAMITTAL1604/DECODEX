import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, useApiQuery } from '../lib/api';

export default function StoryReaderPage() {
  const { user } = useAuth();
  const studentId = user?.id;
  const navigate = useNavigate();

  const [generating, setGenerating] = useState(false);
  const [selectedStory, setSelectedStory] = useState<any | null>(null);

  const { data, loading, refetch } = useApiQuery<any>(`/stories/student/${studentId}`);
  const stories = data?.stories || [];

  const handleGenerateStory = async () => {
    setGenerating(true);
    try {
      const res = await apiFetch<any>('/stories/generate', { method: 'POST', body: JSON.stringify({ student_id: studentId }) });
      setSelectedStory(res.story);
      refetch();
    } catch (err) {
      console.error('Failed to generate story:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-on-surface-variant font-body">Loading adaptive stories...</div>;

  return (
    <main className="flex-grow w-full max-w-[1000px] mx-auto px-container-padding py-8 sm:py-12 text-on-surface">
      <Link to="/" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary font-display text-sm font-bold tracking-[0.08em] uppercase transition-all group mb-6">
        <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
        Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/20 text-secondary font-display text-[10px] font-bold uppercase tracking-widest mb-2">
            <span className="material-symbols-outlined text-sm">auto_stories</span>
            AI Adaptive Library
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-on-surface">AI Story Generator</h1>
          <p className="font-body text-base text-on-surface-variant mt-1">Stories custom-crafted to target your specific reading weaknesses</p>
        </div>

        <button
          onClick={handleGenerateStory}
          disabled={generating}
          className="h-12 px-6 rounded-2xl bg-secondary text-on-secondary font-display text-sm font-bold uppercase tracking-wider transition-all shadow-md hover:bg-secondary-container hover:text-on-secondary-container active:scale-95 disabled:opacity-60 cursor-pointer flex items-center gap-2"
        >
          <span className="material-symbols-outlined">{generating ? 'hourglass_top' : 'auto_awesome'}</span>
          {generating ? 'Crafting Story…' : 'Generate New Story'}
        </button>
      </div>

      {/* Selected Active Story Reader */}
      {selectedStory && (
        <div className="glass-card rounded-3xl p-8 sm:p-10 border border-secondary/30 shadow-xl bg-white/80 mb-10 animate-in fade-in space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-container-highest pb-4">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-secondary-container/20 text-secondary font-display text-xs font-bold uppercase tracking-wider mb-2">
                Level {selectedStory.difficultyLevel} Story
              </span>
              <h2 className="font-display text-3xl font-extrabold text-primary">{selectedStory.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              {selectedStory.targetPhonemes?.map((ph: string, i: number) => (
                <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-display text-xs font-bold border border-emerald-300">
                  Target: /{ph}/
                </span>
              ))}
            </div>
          </div>

          <div className="font-body text-xl leading-relaxed text-on-surface tracking-wide bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high shadow-inner">
            {selectedStory.content}
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={() => setSelectedStory(null)}
              className="px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant font-display text-xs font-bold uppercase tracking-wider hover:bg-surface-container-highest transition-colors cursor-pointer"
            >
              Close Story
            </button>
          </div>
        </div>
      )}

      {/* Library Grid */}
      <h2 className="font-display text-xl font-bold text-on-surface mb-4">Your Story Collection ({stories.length})</h2>
      {stories.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 border border-white/80 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 mb-4 rounded-2xl bg-secondary-container/20 text-secondary flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
          </div>
          <h3 className="font-display text-2xl font-bold text-on-surface mb-2">No custom stories generated yet</h3>
          <p className="font-body text-base text-on-surface-variant max-w-md mb-6">
            Click "Generate New Story" to create a personalized reading text tuned to your specific phonetic needs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stories.map((story: any) => (
            <div key={story.id} className="glass-card rounded-3xl p-6 border border-white/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-display text-[10px] font-bold uppercase tracking-wider">
                    {story.wordCount} words
                  </span>
                  <span className="font-body text-xs text-outline">{new Date(story.createdAt).toLocaleDateString()}</span>
                </div>
                <h3 className="font-display text-xl font-bold text-on-surface mb-2">{story.title}</h3>
                <p className="font-body text-sm text-on-surface-variant line-clamp-3 mb-4">{story.content}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-surface-container-highest">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {story.targetPhonemes?.map((ph: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-display text-[10px] font-bold border border-emerald-200">
                      /{ph}/
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedStory(story)}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary font-display text-xs font-bold uppercase tracking-wider hover:bg-primary-container hover:text-on-primary-container transition-colors cursor-pointer"
                >
                  Read Story
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
