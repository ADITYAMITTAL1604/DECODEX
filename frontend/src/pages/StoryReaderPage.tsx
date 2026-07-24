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
// Helper: Evaluate if spoken text matches target sentence
// ---------------------------------------------------------------------------
function evaluateSentenceRead(sentence: string, spoken: string): boolean {
  if (!spoken || spoken.trim().length === 0) return false;

  const targetWords = sentence.toLowerCase().replace(/[.,!?;:'"]/g, '').split(/\s+/).filter(w => w.length > 2);
  const spokenWords = spoken.toLowerCase().replace(/[.,!?;:'"]/g, '').split(/\s+/);

  if (targetWords.length === 0) return true;

  // Count how many target words were spoken
  let matchedCount = 0;
  for (const tw of targetWords) {
    if (spokenWords.some(sw => sw === tw || sw.includes(tw) || tw.includes(sw))) {
      matchedCount++;
    }
  }

  // Pass if student got at least 50% of content words right
  return (matchedCount / targetWords.length) >= 0.5;
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

      {/* Selected Active Story Reader — interactive repeat-after-me reader */}
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
// NarratedStoryReader — Interactive line-by-line repeat-after-me reading loop
//
// Reads one sentence line -> prompts student to repeat -> listens -> evaluates.
// Repeats line until student reads it effortlessly before advancing!
// ---------------------------------------------------------------------------
function NarratedStoryReader({ story, onClose }: { story: any; onClose: () => void }) {
  const dex = useDex();
  const sentences = useMemo(() => splitIntoSentences(story.content || ''), [story.content]);

  const [currentSentenceIdx, setCurrentSentenceIdx] = useState(-1);
  const [isNarrating, setIsNarrating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const narrationActive = useRef(false);

  const stopNarration = useCallback(() => {
    narrationActive.current = false;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsNarrating(false);
    setStatusMessage(null);
  }, []);

  // Start interactive line-by-line reading
  const startNarration = useCallback(async () => {
    if (narrationActive.current) return;
    narrationActive.current = true;
    setIsNarrating(true);
    setFinished(false);

    await dex.speak(`Let's read ${story.title} together! I'll read line by line, then you repeat after me.`);

    for (let i = 0; i < sentences.length; i++) {
      if (!narrationActive.current) break;

      setCurrentSentenceIdx(i);
      const sentence = sentences[i];
      let linePassed = false;
      let attemptCount = 0;

      while (!linePassed && narrationActive.current) {
        attemptCount++;

        // 1. Dex reads the line aloud
        setStatusMessage(`${TUTOR_NAME} is reading the line…`);
        await dex.speak(sentence);

        if (!narrationActive.current) break;

        // 2. Dex prompts student to repeat
        setStatusMessage(`Now your turn! Read the line aloud into your mic.`);
        await dex.speak("Now your turn! Read this line aloud into your microphone.");

        if (!narrationActive.current) break;

        // 3. Listen for student's voice input
        setStatusMessage(`Listening for your speech…`);
        const spoken = await dex.listen('short');

        if (!narrationActive.current) break;

        // 4. Evaluate spoken text against current sentence line
        const passed = evaluateSentenceRead(sentence, spoken);

        if (passed) {
          linePassed = true;
          setStatusMessage(`🎉 Great job! Line mastered.`);
          await dex.speak("Great job! You read that line effortlessly!");
        } else {
          setStatusMessage(`Not quite — let's practice this line again!`);
          await dex.speak("Not quite! Let me read it again, then you repeat after me.");
          await new Promise(r => setTimeout(r, 500));
        }
      }
    }

    if (narrationActive.current) {
      await dex.speak("Awesome effort! You completed the entire story line by line!");
      setFinished(true);
    }

    narrationActive.current = false;
    setIsNarrating(false);
    setStatusMessage(null);
  }, [sentences, dex, story.title]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      narrationActive.current = false;
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
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

      {/* Story content with sentence line highlighting */}
      <div className="font-body text-lg leading-relaxed text-on-surface tracking-wide bg-surface-container-lowest p-6 rounded-2xl border border-surface-container-high shadow-inner space-y-2">
        {sentences.map((sentence, i) => (
          <p
            key={i}
            className={`p-2 rounded-xl transition-all duration-300 ${
              i === currentSentenceIdx
                ? 'bg-primary/15 text-primary font-bold border-l-4 border-primary pl-3'
                : i < currentSentenceIdx
                ? 'text-on-surface-variant opacity-75'
                : 'text-on-surface'
            }`}
          >
            {sentence}
          </p>
        ))}
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-center font-display text-xs font-bold text-indigo-900 shadow-sm animate-pulse">
          {statusMessage}
        </div>
      )}

      {/* Finished banner */}
      {finished && (
        <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-300 text-center">
          <span className="material-symbols-outlined text-4xl text-emerald-600 mb-2">celebration</span>
          <h3 className="font-display text-xl font-bold text-emerald-900">Story Complete! 🎉</h3>
          <p className="font-body text-sm text-emerald-800 mt-1">You read every line effortlessly with {TUTOR_NAME}. Fantastic job!</p>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-between gap-4">
        <button
          onClick={() => {
            stopNarration();
            onClose();
          }}
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
            {finished ? 'Read Again' : currentSentenceIdx >= 0 ? 'Resume Interactive Reading' : `Read with ${TUTOR_NAME}`}
          </button>
        ) : (
          <button
            onClick={stopNarration}
            className="px-6 py-2.5 rounded-xl bg-red-500 text-white font-display text-xs font-bold uppercase tracking-wider hover:bg-red-600 active:scale-95 transition-all cursor-pointer flex items-center gap-2 shadow-md"
          >
            <span className="material-symbols-outlined text-base">stop</span>
            Stop Reading
          </button>
        )}
      </div>
    </div>
  );
}
