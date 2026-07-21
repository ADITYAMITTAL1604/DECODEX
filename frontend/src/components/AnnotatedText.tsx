import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

interface Classification {
  word_index: number;
  source_word: string | null;
  spoken_word: string | null;
  category: string;
  rationale: string;
}

interface Props {
  sessionId: string;
  originalText?: string;
  classifications?: Classification[];
}

function buildSourceIndexMap(
  classifications: Classification[] = [],
): Map<number, Classification[]> {
  const map = new Map<number, Classification[]>();
  if (!Array.isArray(classifications)) return map;

  for (const c of classifications) {
    if (c.word_index !== undefined && c.word_index !== null) {
      if (!map.has(c.word_index)) map.set(c.word_index, []);
      map.get(c.word_index)!.push(c);
    }
  }

  return map;
}

export default function AnnotatedText({ sessionId, originalText = '', classifications = [] }: Props) {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const words = (originalText || '').split(/\s+/).filter(w => w.length > 0);
  
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<number | null>(null);

  const errorMap = buildSourceIndexMap(classifications || []);

  const handleCorrection = async (wordIndex: number, newCategory: string) => {
    setSubmitting(wordIndex);
    try {
      await apiFetch(`/sessions/${sessionId}/classifications/${wordIndex}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ corrected_category: newCategory })
      });
      setOverrides(prev => ({ ...prev, [wordIndex]: newCategory }));
    } catch (err) {
      alert('Failed to submit correction.');
    } finally {
      setSubmitting(null);
    }
  };

  const getStyleForCategory = (cat: string) => {
    switch (cat) {
      case 'SUB': return 'bg-[#fef08a] border-b-2 border-[#eab308] text-on-surface px-1 mx-0.5 rounded-sm';
      case 'OMI': return 'bg-[#d1fae5] border-b-2 border-[#10b981] text-on-surface px-1 mx-0.5 rounded-sm';
      case 'INS': return 'bg-[#ffedd5] border-b-2 border-[#f97316] text-on-surface px-1 mx-0.5 rounded-sm';
      case 'REV': return 'bg-[#e9d5ff] border-b-2 border-[#a855f7] text-on-surface px-1 mx-0.5 rounded-sm';
      case 'UNC': return 'bg-[#bae6fd] border-b-2 border-[#0ea5e9] text-on-surface px-1 mx-0.5 rounded-sm';
      case 'BLD': return 'bg-orange-200 text-orange-900 border-b-2 border-orange-400 px-1 mx-0.5 rounded-sm';
      case 'PAC': return 'bg-teal-200 text-teal-900 border-b-2 border-teal-400 px-1 mx-0.5 rounded-sm';
      default: return 'bg-transparent text-on-surface';
    }
  };

  return (
    <div className="font-body text-lg leading-relaxed flex flex-wrap gap-y-3 items-baseline">
      {words.map((word, index) => {
        const errorsAtPos = errorMap.get(index) || [];
        const activeError = errorsAtPos[0];
        const effectiveCategory = activeError ? (overrides[activeError.word_index] || activeError.category) : null;

        return (
          <span key={index} className="relative group inline-block mr-1.5">
            <span className={effectiveCategory ? getStyleForCategory(effectiveCategory) : 'text-on-surface'}>
              {word}
            </span>
            
            {activeError && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-20 w-48 pointer-events-auto">
                <div className="bg-surface-container-highest text-on-surface text-xs rounded-xl p-3 shadow-xl border border-surface-variant w-full">
                  <div className="font-bold font-display uppercase tracking-[0.08em] text-primary mb-1">
                    {effectiveCategory} ({activeError.category})
                  </div>
                  <p className="text-on-surface-variant font-body mb-2 text-[11px] leading-snug">{activeError.rationale}</p>
                  
                  {isTeacher && (
                    <div className="border-t border-surface-variant pt-2 mt-2">
                      <p className="text-[10px] font-bold uppercase text-outline mb-1">Override Classification:</p>
                      <div className="grid grid-cols-4 gap-1">
                        {['REV', 'SUB', 'OMI', 'INS'].map(cat => (
                          <button
                            key={cat}
                            disabled={submitting === activeError.word_index}
                            onClick={() => handleCorrection(activeError.word_index, cat)}
                            className={`px-1 py-0.5 text-[9px] font-bold rounded ${effectiveCategory === cat ? 'bg-primary text-on-primary' : 'bg-surface-container hover:bg-surface-container-high text-on-surface'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-2 h-2 bg-surface-container-highest rotate-45 -mt-1 shadow-sm"></div>
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}
