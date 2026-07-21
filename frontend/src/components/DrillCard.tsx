import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Target, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

interface WordDetail {
  word: string;
  target?: string;
  spoken?: string | null;
}

interface Drill {
  id: string;
  session_id?: string;
  target_category: string;
  drill_type: string;
  content: any;
  completed: boolean;
}

interface Props {
  drill: Drill;
}

export default function DrillCard({ drill }: Props) {
  const navigate = useNavigate();
  const { id: routeSessionId } = useParams();

  if (!drill) return null;

  const content = typeof drill.content === 'string' 
    ? (function() { try { return JSON.parse(drill.content); } catch { return {}; } })() 
    : (drill.content || {});

  const getCategoryName = (cat: string) => {
    const map: Record<string, string> = {
      'REV': 'Letter / Word Reversals',
      'SUB': 'Word Substitutions',
      'BLD': 'Phoneme Blending',
      'OMI': 'Omitted Words',
      'INS': 'Inserted Words',
    };
    return map[cat] || cat;
  };

  const rawWordsList: any[] = Array.isArray(content.words) ? content.words : [];
  const wordsList: string[] = rawWordsList.map(item => {
    if (typeof item === 'string') return item.replace(/[.,!?;:'"]/g, '').trim();
    return (item.word || item.target || '').replace(/[.,!?;:'"]/g, '').trim();
  }).filter(w => w && w.length > 0);

  const displayWords = wordsList.length > 0 ? wordsList.slice(0, 5) : ['scared', 'bottom', 'breathe'];
  const targetSessionId = drill.session_id || routeSessionId;

  return (
    <div className="glass-card rounded-[28px] border border-white/80 shadow-sm p-6 flex flex-col gap-5 bg-surface-container-lowest">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center shrink-0 shadow-inner">
          <Target className="w-6 h-6" />
        </div>
        <div>
          <span className="font-display text-[11px] font-bold uppercase tracking-wider text-primary">Personalized AI Practice</span>
          <h3 className="font-display text-lg font-bold text-on-surface">{drill.drill_type || 'Pronunciation Clinic'}</h3>
        </div>
      </div>
      
      <p className="font-body text-sm text-on-surface-variant leading-relaxed">
        Based on your reading, AI extracted the exact words you mispronounced (<strong className="text-on-surface font-semibold">{getCategoryName(drill.target_category)}</strong>).
      </p>
      
      <div className="bg-surface-container-low/60 rounded-2xl p-5 border border-surface-container-highest flex flex-col items-center gap-4 text-center">
        <p className="font-body text-xs font-bold uppercase tracking-wider text-on-surface-variant">Words to practice from your audio:</p>
        
        <div className="flex flex-wrap items-center justify-center gap-2">
          {displayWords.map((word, idx) => (
            <span key={idx} className="px-3.5 py-1.5 bg-white text-primary font-display font-bold text-base rounded-xl shadow-xs border border-surface-variant">
              {word}
            </span>
          ))}
        </div>

        {drill.completed ? (
          <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-100 text-emerald-800 rounded-full font-display text-sm font-bold shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Drill Completed! Great Job!
          </div>
        ) : (
          <button 
            onClick={() => navigate(`/sessions/${targetSessionId}/practice`)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-on-primary rounded-2xl font-display text-sm font-bold hover:bg-primary-container hover:text-on-primary-container active:scale-95 transition-all shadow-md cursor-pointer mt-1"
          >
            <Sparkles className="w-4 h-4" />
            Start Interactive Practice Clinic <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
