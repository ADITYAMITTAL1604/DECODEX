import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, useApiQuery } from '../lib/api';

interface Passage {
  id: string;
  title: string;
  content: string;
  grade_level: number;
  word_count: number;
}

export default function PassageSelection() {
  const [generating, setGenerating] = useState(false);
  const { data, loading, error, refetch } = useApiQuery<{ passages: Passage[] }>('/passages');

  const handleGeneratePassage = async () => {
    setGenerating(true);
    try {
      await apiFetch('/passages/generate', {
        method: 'POST',
        body: JSON.stringify({ grade_level: 3 }),
      });
      refetch();
    } catch (err) {
      console.error('Failed to generate passage:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-on-surface-variant font-body">Loading passages...</div>;
  if (error) return <div className="p-8 text-center text-error font-body">Error loading passages: {error.message}</div>;

  return (
    <main className="w-full max-w-max-content-width mx-auto px-container-padding py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Link to="/" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary font-display text-sm font-bold tracking-[0.08em] uppercase transition-colors w-fit">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to Dashboard
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-on-surface">Select a Reading Passage</h1>
          <p className="font-body text-lg text-on-surface-variant">Choose a passage or generate a fresh AI text to begin your reading assessment.</p>
        </div>

        {/* Dynamic AI Passage Generator Button */}
        <button
          onClick={handleGeneratePassage}
          disabled={generating}
          className="h-14 px-6 rounded-2xl bg-secondary text-on-secondary font-display text-sm font-bold uppercase tracking-wider transition-all shadow-md hover:bg-secondary-container hover:text-on-secondary-container active:scale-95 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined">{generating ? 'hourglass_top' : 'auto_awesome'}</span>
          {generating ? 'Crafting Passage…' : 'Generate Fresh AI Passage'}
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {data?.passages.map((passage) => (
          <div 
            key={passage.id} 
            className="p-6 sm:p-8 glass-card glass-card-hover rounded-3xl border border-white/80 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 rounded-2xl bg-primary-container/20 flex items-center justify-center text-primary shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-3xl">auto_stories</span>
                </div>
                <h3 className="font-display text-xl font-bold text-on-surface group-hover:text-primary transition-colors">{passage.title}</h3>
              </div>
              <div className="flex gap-2.5 text-xs font-display font-bold uppercase tracking-[0.08em] text-outline mb-4">
                <span className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-surface-variant">Grade {passage.grade_level}</span>
                <span className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full border border-surface-variant">{passage.word_count} words</span>
              </div>
              <p className="font-body text-on-surface-variant text-base line-clamp-3 mb-6 leading-relaxed">
                {passage.content}
              </p>
            </div>
            <Link 
              to={`/session/${passage.id}`}
              className="w-full text-center px-6 py-3.5 bg-primary text-on-primary rounded-2xl font-display text-sm font-bold uppercase tracking-[0.08em] hover:bg-on-primary-fixed-variant transition-all duration-200 shadow-lg shadow-primary/20 active:scale-[0.98] inline-flex items-center justify-center gap-2"
            >
              Start Reading
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
