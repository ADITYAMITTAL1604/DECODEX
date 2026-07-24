import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, useApiQuery } from '../lib/api';
import { useDex } from '../hooks/useDex';
import DexAvatar from '../components/DexAvatar';
import { TUTOR_NAME } from '../lib/constants';

// ---------------------------------------------------------------------------
// Utility: split content into sentences for narration pacing
// ---------------------------------------------------------------------------
function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// ---------------------------------------------------------------------------
// Simple comprehension question generator.
// Produces basic recall questions from the preceding sentence group.
// These are ungraded practice — NOT wired into health score computation.
// ---------------------------------------------------------------------------
function generateComprehensionQuestion(sentences: string[]): { question: string; expectedAnswer: string } {
  // Pick the most recent meaningful sentence
  const source = sentences[sentences.length - 1] || '';
  const words = source.replace(/[.,!?;:'"]/g, '').split(/\s+/).filter(w => w.length > 3);

  if (words.length === 0) {
    return { question: 'Can you tell me what happened in the story?', expectedAnswer: 'story' };
  }

  // Pick a notable word (longer = more likely to be a content word)
  const sorted = [...words].sort((a, b) => b.length - a.length);
  const keyword = sorted[0].toLowerCase();

  return {
    question: `What word means something important in this part of the story? I'm thinking of the word "${keyword}". Can you say it?`,
    expectedAnswer: keyword,
  };
}

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

      {/* Selected Active Story Reader — now with Dex narration */}
      {selectedStory && (
        <NarratedStoryReader
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
        />
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

// ---------------------------------------------------------------------------
// NarratedStoryReader — Sentence-by-sentence narration with comprehension checks
//
// IMPORTANT: Comprehension results are NOT wired into health score computation.
// This is a separate, ungraded, "just for practice" loop. If this needs to
// change later, that's a deliberate follow-up decision, not part of this build.
// ---------------------------------------------------------------------------
function NarratedStoryReader({ story, onClose }: { story: any; onClose: () => void }) {
  const dex = useDex();
  const sentences = useMemo(() => splitIntoSentences(story.content || ''), [story.content]);

  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(-1); // -1 = not started
  const [isNarrating, setIsNarrating] = useState(false);
  const [showComprehension, setShowComprehension] = useState(false);
  const [comprehensionResult, setComprehensionResult] = useState<{ correct: boolean; feedback: string } | null>(null);
  const [finished, setFinished] = useState(false);

  const narrationActive = useRef(false);
  const COMPREHENSION_INTERVAL = 4; // Ask a comprehension question every N sentences

  // Start narration
  const startNarration = useCallback(async () => {
    if (narrationActive.current) return;
    narrationActive.current = true;
    setIsNarrating(true);
    setFinished(false);

    await dex.speak(`Let's read ${story.title} together!`);

    for (let i = 0; i < sentences.length; i++) {
      if (!narrationActive.current) break;

      setCurrentSentenceIdx(i);
      await dex.speak(sentences[i]);

      // Comprehension check at regular intervals
      if ((i + 1) % COMPREHENSION_INTERVAL === 0 && i < sentences.length - 1 && narrationActive.current) {
        const recentSentences = sentences.slice(Math.max(0, i - COMPREHENSION_INTERVAL + 1), i + 1);
        const { question, expectedAnswer } = generateComprehensionQuestion(recentSentences);

        setShowComprehension(true);
        setComprehensionResult(null);

        // Run the ask cycle — speak question → listen → grade → feedback
        const result = await dex.ask(question, expectedAnswer);
        setComprehensionResult(result);

        // On incorrect, retry once
        if (!result.correct && narrationActive.current) {
          await dex.speak("Let's try that one more time!");
          const retry = await dex.ask(question, expectedAnswer);
          setComprehensionResult(retry);
        }

        // Brief pause before continuing
        await new Promise(r => setTimeout(r, 1500));
        setShowComprehension(false);
        setComprehensionResult(null);
      }
    }

    if (narrationActive.current) {
      await dex.speak("Great job! You finished the whole story!");
      setFinished(true);
    }

    narrationActive.current = false;
    setIsNarrating(false);
  }, [sentences, dex, story.title]);

  const stopNarration = useCallback(() => {
    narrationActive.current = false;
    setIsNarrating(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { narrationActive.current = false; };
  }, []);

  return (
    <div className="glass-card rounded-3xl p-8 sm:p-10 border border-secondary/30 shadow-xl bg-white/80 mb-10 animate-in fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-surface-container-highest pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-3 py-1 rounded-full bg-secondary-container/20 text-secondary font-display text-xs font-bold uppercase tracking-wider">
              Level {story.difficultyLevel} Story
            </span>
            {story.wordCount && (
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary font-display text-xs font-bold uppercase tracking-wider">
                {story.wordCount} Words
              </span>
            )}
          </div>
          <h2 className="font-display text-3xl font-extrabold text-primary">{story.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {story.targetPhonemes?.map((ph: string, i: number) => (
            <span key={i} className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-display text-xs font-bold border border-emerald-300">
              Target: /{ph}/
            </span>
          ))}
        </div>
      </div>

      {/* Dex Avatar */}
      <div className="flex justify-center">
        <DexAvatar state={dex.state} caption={dex.caption} />
      </div>

      {/* Story content with sentence highlighting */}
      <div className="font-body text-lg leading-relaxed text-on-surface tracking-wide bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high shadow-inner space-y-1">
        {sentences.map((sentence, i) => (
          <span
            key={i}
            className={`transition-all duration-300 ${
              i === currentSentenceIdx
                ? 'bg-primary/15 text-primary font-semibold rounded px-1 py-0.5'
                : i < currentSentenceIdx
                ? 'text-on-surface-variant'
                : 'text-on-surface'
            }`}
          >
            {sentence}{' '}
          </span>
        ))}
      </div>

      {/* Comprehension check indicator */}
      {showComprehension && (
        <div className={`p-4 rounded-2xl border text-center font-display text-sm font-bold transition-all ${
          comprehensionResult
            ? comprehensionResult.correct
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-orange-50 border-orange-300 text-orange-900'
            : 'bg-indigo-50 border-indigo-300 text-indigo-900'
        }`}>
          {comprehensionResult
            ? comprehensionResult.feedback
            : `${TUTOR_NAME} is asking a comprehension question…`
          }
        </div>
      )}

      {/* Finished banner */}
      {finished && (
        <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-300 text-center">
          <span className="material-symbols-outlined text-4xl text-emerald-600 mb-2">celebration</span>
          <h3 className="font-display text-xl font-bold text-emerald-900">Story Complete! 🎉</h3>
          <p className="font-body text-sm text-emerald-800 mt-1">You read the whole story with {TUTOR_NAME}. Great work!</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-between gap-4">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant font-display text-xs font-bold uppercase tracking-wider hover:bg-surface-container-highest transition-colors cursor-pointer"
        >
          Close Story
        </button>

        {!isNarrating ? (
          <button
            onClick={startNarration}
            className="px-6 py-2.5 rounded-xl bg-secondary text-on-secondary font-display text-xs font-bold uppercase tracking-wider hover:bg-secondary-container hover:text-on-secondary-container transition-colors cursor-pointer flex items-center gap-2 shadow-md"
          >
            <span className="material-symbols-outlined text-base">play_arrow</span>
            {finished ? 'Read Again' : currentSentenceIdx >= 0 ? 'Resume Reading' : `Read with ${TUTOR_NAME}`}
          </button>
        ) : (
          <button
            onClick={stopNarration}
            className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-display text-xs font-bold uppercase tracking-wider hover:bg-red-600 transition-colors cursor-pointer flex items-center gap-2 shadow-md"
          >
            <span className="material-symbols-outlined text-base">pause</span>
            Pause Reading
          </button>
        )}
      </div>
    </div>
  );
}
