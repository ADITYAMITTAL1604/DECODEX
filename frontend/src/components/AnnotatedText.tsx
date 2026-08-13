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
    } catch {
      alert('Failed to submit correction.');
    } finally {
      setSubmitting(null);
    }
  };

  const getStyleForCategory = (cat: string) => {
    switch (cat) {
      case 'SUB': return 'bg-[#fef08a] border-b-2 border-[#eab308] text-on-surface px-1.5 py-0.5 mx-0.5 rounded-md transition-all group-hover:ring-2 group-hover:ring-[#eab308]/50';
      case 'OMI': return 'bg-[#d1fae5] border-b-2 border-[#10b981] text-on-surface px-1.5 py-0.5 mx-0.5 rounded-md transition-all group-hover:ring-2 group-hover:ring-[#10b981]/50';
      case 'INS': return 'bg-[#ffedd5] border-b-2 border-[#f97316] text-on-surface px-1.5 py-0.5 mx-0.5 rounded-md transition-all group-hover:ring-2 group-hover:ring-[#f97316]/50';
      case 'REV': return 'bg-[#e9d5ff] border-b-2 border-[#a855f7] text-on-surface px-1.5 py-0.5 mx-0.5 rounded-md transition-all group-hover:ring-2 group-hover:ring-[#a855f7]/50';
      case 'UNC': return 'bg-[#bae6fd] border-b-2 border-[#0ea5e9] text-on-surface px-1.5 py-0.5 mx-0.5 rounded-md transition-all group-hover:ring-2 group-hover:ring-[#0ea5e9]/50';
      case 'BLD': return 'bg-orange-200 text-orange-900 border-b-2 border-orange-400 px-1.5 py-0.5 mx-0.5 rounded-md transition-all group-hover:ring-2 group-hover:ring-orange-400/50';
      case 'PAC': return 'bg-teal-200 text-teal-900 border-b-2 border-teal-400 px-1.5 py-0.5 mx-0.5 rounded-md transition-all group-hover:ring-2 group-hover:ring-teal-400/50';
      default: return 'bg-transparent text-on-surface';
    }
  };

  return (
    <div className="font-body text-xl leading-loose flex flex-wrap gap-y-3 items-baseline">
      {words.map((word, index) => {
        const errorsAtPos = errorMap.get(index) || [];
        const activeError = errorsAtPos[0];
        const effectiveCategory = activeError ? (overrides[activeError.word_index] || activeError.category) : null;

        // Smart positioning: prevent tooltips from cropping at top line or left/right container corners
        const isTopLine = index < 6;
        const isLeftColumn = index % 8 < 2;
        const isRightColumn = index % 8 >= 6;

        const vPos = isTopLine ? 'top-full mt-2' : 'bottom-full mb-2';
        const hPos = isLeftColumn
          ? 'left-0 translate-x-0'
          : isRightColumn
          ? 'right-0 left-auto translate-x-0'
          : 'left-1/2 -translate-x-1/2';

        return (
          <span key={index} className="relative group inline-block mr-2">
            <span className={`cursor-pointer ${effectiveCategory ? getStyleForCategory(effectiveCategory) : 'text-on-surface hover:text-primary transition-colors'}`}>
              {word}
            </span>
            
            {activeError && (
              <div className={`absolute ${vPos} ${hPos} hidden group-hover:flex flex-col items-center z-40 w-56 pointer-events-auto transition-all animate-in fade-in duration-150`}>
                {/* Top arrow when tooltip pops down */}
                {isTopLine && (
                  <div className="w-2.5 h-2.5 bg-surface-container-highest rotate-45 -mb-1 shadow-sm border-t border-l border-surface-variant z-50"></div>
                )}
                
                <div className="bg-surface-container-highest text-on-surface text-xs rounded-2xl p-3.5 shadow-2xl border border-surface-variant w-full relative z-40">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold font-display text-[11px] uppercase tracking-wider text-primary">
                      {effectiveCategory} {activeError.category !== effectiveCategory && `(${activeError.category})`}
                    </span>
                    {activeError.spoken_word && (
                      <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-display text-[10px] font-bold">
                        Spoken: "{activeError.spoken_word}"
                      </span>
                    )}
                  </div>
                  <p className="text-on-surface-variant font-body mb-2 text-[12px] leading-relaxed">{activeError.rationale}</p>
                  
                  {isTeacher && (
                    <div className="border-t border-surface-variant/80 pt-2.5 mt-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-outline mb-1.5">Teacher Override:</p>
                      <div className="grid grid-cols-4 gap-1">
                        {['REV', 'SUB', 'OMI', 'INS'].map(cat => (
                          <button
                            key={cat}
                            disabled={submitting === activeError.word_index}
                            onClick={() => handleCorrection(activeError.word_index, cat)}
                            className={`px-1.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                              effectiveCategory === cat
                                ? 'bg-primary text-on-primary shadow-xs'
                                : 'bg-surface-container hover:bg-surface-container-high text-on-surface'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom arrow when tooltip pops up */}
                {!isTopLine && (
                  <div className="w-2.5 h-2.5 bg-surface-container-highest rotate-45 -mt-1 shadow-sm border-b border-r border-surface-variant z-50"></div>
                )}
              </div>
            )}
          </span>
        );
      })}
    </div>
  );
}
