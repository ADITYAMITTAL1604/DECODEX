import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApiQuery, apiFetch } from '../lib/api';
import { Target, ArrowRight, CheckCircle2, Volume2, Sparkles, X, ChevronRight, Mic, RefreshCw, Award, XCircle, ArrowLeft } from 'lucide-react';
import { useDex } from '../hooks/useDex';
import DexAvatar from '../components/DexAvatar';
import { TUTOR_NAME } from '../lib/constants';

interface WordDetail {
  word: string;
  target?: string;
  spoken?: string | null;
  spelling?: string;
  phonics?: string;
  category?: string;
  rationale?: string;
}

function editDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export default function PracticePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useApiQuery<any>(`/sessions/${id}/results`);

  const [currentWordIdx, setCurrentWordIdx] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [micStatus, setMicStatus] = useState<'idle' | 'listening'>('idle');
  const [speechFeedback, setSpeechFeedback] = useState<{ correct: boolean; spoken: string; message: string } | null>(null);

  const dex = useDex();
  const recognitionRef = useRef<any>(null);

  const session = data?.session;
  const drills = data?.drills || [];
  const primaryDrill = Array.isArray(drills) && drills.length > 0 ? drills[0] : null;

  const content = primaryDrill ? (typeof primaryDrill.content === 'string' 
    ? (function() { try { return JSON.parse(primaryDrill.content); } catch { return {}; } })() 
    : (primaryDrill.content || {})) : {};

  // Extract mispronounced word list
  const rawWordsList: any[] = Array.isArray(content.words) ? content.words : [];
  const wordsList: WordDetail[] = rawWordsList.map(item => {
    if (typeof item === 'string') {
      const clean = item.replace(/[.,!?;:'"]/g, '').trim();
      return {
        word: clean,
        target: clean,
        spelling: clean.toUpperCase().split('').join(' • '),
        phonics: clean.toLowerCase(),
      };
    }
    const cleanWord = (item.word || item.target || '').replace(/[.,!?;:'"]/g, '').trim();
    return {
      word: cleanWord,
      target: cleanWord,
      spoken: item.spoken || null,
      spelling: item.spelling || cleanWord.toUpperCase().split('').join(' • '),
      phonics: item.phonics || cleanWord.toLowerCase(),
      category: item.category,
      rationale: item.rationale,
    };
  }).filter(w => w.word && w.word.length > 0);

  const activeWords: WordDetail[] = wordsList.length > 0 ? wordsList : [
    { word: 'scared', target: 'scared', spoken: 'scard', spelling: 'S • C • A • R • E • D', phonics: 'sk-air-d' },
    { word: 'bottom', target: 'bottom', spoken: null, spelling: 'B • O • T • T • O • M', phonics: 'bot-tom' },
    { word: 'breathe', target: 'breathe', spoken: 'breath', spelling: 'B • R • E • A • T • H • E', phonics: 'br-ee-th' }
  ];

  const currentWord = activeWords[Math.min(currentWordIdx, activeWords.length - 1)];

  // --- Use Dex for word audio instead of raw browser speechSynthesis ---
  // NOTE: Could swap dex.listen('short') for dex.listen('long') (Whisper) here
  // for better accuracy, but browser SpeechRecognition is kept for per-word
  // practice because Whisper adds ~2-3s latency per word, which hurts the
  // rapid-fire practice flow's responsiveness.
  const playWordAudio = (word: string) => {
    dex.speak(word);
  };

  useEffect(() => {
    if (currentWord?.word) {
      playWordAudio(currentWord.word);
    }
  }, [currentWordIdx, data]);

  const startSpeechVerification = (targetWord: string) => {
    // Cancel TTS audio to prevent system mic lockup
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setMicStatus('listening');
    setSpeechFeedback(null);

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setTimeout(() => {
        setSpeechFeedback({
          correct: true,
          spoken: targetWord,
          message: `🎉 Great Pronunciation Attempt for "${targetWord}"!`
        });
        setMicStatus('idle');
      }, 2000);
      return;
    }

    let timeoutId: any = null;

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      setMicStatus('idle');
    };

    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }

      const recognition = new SpeechRec();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      // 6-second max safety timeout so the button never freezes
      timeoutId = setTimeout(() => {
        try { recognition.abort(); } catch (e) {}
        cleanup();
        setSpeechFeedback({
          correct: false,
          spoken: '',
          message: 'Listening timed out. Click to try speaking again!'
        });
      }, 6000);

      recognition.onstart = () => {
        setMicStatus('listening');
      };

      recognition.onend = () => {
        cleanup();
      };

      recognition.onresult = (event: any) => {
        cleanup();
        const spokenRaw = event.results[0][0].transcript || '';
        const spoken = spokenRaw.toLowerCase().replace(/[.,!?;:'"]/g, '').trim();
        const target = targetWord.toLowerCase().replace(/[.,!?;:'"]/g, '').trim();

        const spokenWords: string[] = spoken.split(/\s+/);
        const isMatch = spoken === target || spokenWords.some((w: string) => w === target);

        if (isMatch) {
          // Dex celebrates and gives spoken positive feedback
          dex.speak(`Great job! You said ${spoken} perfectly!`);
          setSpeechFeedback({
            correct: true,
            spoken,
            message: `🎉 Perfect Pronunciation! You correctly said "${spoken}"!`
          });
        } else {
          // Dex gives encouraging feedback and prompts retry
          dex.speak(`Not quite. Let's try saying ${target} again!`);
          setSpeechFeedback({
            correct: false,
            spoken,
            message: `You said "${spoken}". Target is "${target}". Listen again and try!`
          });
        }
      };

      recognition.onerror = () => {
        cleanup();
        setSpeechFeedback({
          correct: false,
          spoken: '',
          message: 'Microphone did not hear speech clearly. Click to try speaking again!'
        });
      };

      recognition.start();
    } catch (err) {
      cleanup();
    }
  };

  const handleNextWord = async () => {
    setSpeechFeedback(null);

    if (currentWordIdx < activeWords.length - 1) {
      const nextIdx = currentWordIdx + 1;
      setCurrentWordIdx(nextIdx);
    } else {
      setIsSubmitting(true);
      try {
        if (primaryDrill) {
          await apiFetch(`/sessions/drills/${primaryDrill.id}/complete`, { method: 'POST' });
        }
      } catch (e) {
        console.warn('Could not record drill completion:', e);
      } finally {
        setIsSubmitting(false);
        navigate(`/sessions/${id}/results`);
      }
    }
  };

  if (loading) return <div className="p-12 text-center text-on-surface-variant font-body text-lg">Loading practice session...</div>;
  if (error) return <div className="p-12 text-center text-error font-body text-lg">Error: {error.message}</div>;

  return (
    <main className="w-full max-w-4xl mx-auto px-container-padding py-8 space-y-8 text-on-surface pb-24">
      {/* Header & Back Navigation */}
      <div className="space-y-4">
        <Link 
          to={`/sessions/${id}/results`}
          className="inline-flex items-center gap-2 text-primary hover:text-primary-container font-display text-sm font-bold tracking-[0.08em] transition-all group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Reading Results
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary font-display text-xs font-bold uppercase tracking-[0.1em] mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              Interactive Dyslexia Practice Clinic
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-on-surface">
              Pronunciation & Sight Word Clinic
            </h1>
            <p className="font-body text-base text-on-surface-variant mt-1">
              Passage: <strong className="font-medium text-on-surface">{session?.title || 'Reading Practice'}</strong>
            </p>
          </div>

          <div className="px-4 py-2 bg-primary-container/30 border border-primary/20 rounded-2xl flex items-center gap-2 text-primary font-display text-xs font-bold uppercase tracking-wider shrink-0">
            <Target className="w-4 h-4" />
            Word {currentWordIdx + 1} of {activeWords.length}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-surface-container-high h-3.5 rounded-full overflow-hidden p-0.5 border border-surface-variant">
        <div 
          className="bg-primary h-full transition-all duration-300 rounded-full"
          style={{ width: `${((currentWordIdx + 1) / activeWords.length) * 100}%` }}
        ></div>
      </div>

      {/* Main Interactive Light Mode Stage Card */}
      <div className="glass-card rounded-[32px] p-8 sm:p-12 border border-white/90 shadow-xl flex flex-col items-center text-center gap-8 bg-surface-container-lowest">
        
        {/* Target Word */}
        <div className="space-y-2">
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">Target Practice Word</span>
          <h1 className="font-display text-5xl sm:text-7xl font-extrabold text-primary tracking-wide">
            {currentWord.word}
          </h1>

          {/* Dex Avatar — shows speaking/listening/celebrating/concerned state */}
          <div className="flex justify-center mt-4">
            <DexAvatar
              state={micStatus === 'listening' ? 'listening' : dex.state}
              caption={dex.caption}
            />
          </div>

          {currentWord.spoken && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-900 font-body text-xs mt-2">
              <span>In your recording: <span className="line-through font-semibold text-amber-800">{currentWord.spoken}</span></span>
              <span>➔</span>
              <span className="font-bold text-primary">Target: {currentWord.word}</span>
            </div>
          )}
        </div>

        {/* Letter Spelling & Phonics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <div className="bg-surface-container-low/70 rounded-2xl p-5 border border-surface-container-highest flex flex-col items-center shadow-inner">
            <span className="font-display text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Letter-by-Letter Spelling</span>
            <span className="font-display text-2xl font-extrabold text-primary tracking-[0.2em]">
              {currentWord.spelling}
            </span>
          </div>

          <div className="bg-surface-container-low/70 rounded-2xl p-5 border border-surface-container-highest flex flex-col items-center shadow-inner">
            <span className="font-display text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Phonics Sound Guide</span>
            <span className="font-display text-2xl font-extrabold text-emerald-700 tracking-wider">
              {currentWord.phonics}
            </span>
          </div>
        </div>

        {/* Audio Listen Button */}
        <button 
          onClick={() => playWordAudio(currentWord.word)}
          className="w-full py-4 px-6 rounded-2xl bg-primary text-on-primary font-display text-base font-bold flex items-center justify-center gap-3 transition-all shadow-md hover:bg-primary-container hover:text-on-primary-container active:scale-95 cursor-pointer"
        >
          <Volume2 className="w-6 h-6 animate-pulse" />
          Listen to Correct Audio Pronunciation
        </button>

        {/* Live Speech Verification Mic Button */}
        <div className="w-full flex flex-col items-center gap-3">
          <button 
            onClick={() => startSpeechVerification(currentWord.word)}
            disabled={micStatus === 'listening'}
            className={`w-full py-4 px-6 rounded-2xl font-display text-base font-bold flex items-center justify-center gap-3 transition-all shadow-md cursor-pointer ${
              micStatus === 'listening' 
                ? 'bg-amber-500 text-white animate-pulse' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
            }`}
          >
            <Mic className="w-6 h-6" />
            {micStatus === 'listening' ? `Listening… Speak "${currentWord.word}" Now!` : `Speak "${currentWord.word}" to Verify Pronunciation`}
          </button>

          {/* Real-time Feedback Result */}
          {speechFeedback && (
            <div className={`w-full p-4 rounded-2xl border text-sm font-display font-bold flex items-center justify-center gap-2 animate-in fade-in ${
              speechFeedback.correct 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              {speechFeedback.correct ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{speechFeedback.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Page Navigation Controls */}
      <div className="w-full flex items-center justify-between gap-4 pt-2">
        <button
          onClick={() => playWordAudio(currentWord.word)}
          className="px-6 py-4 rounded-2xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-display text-sm font-bold transition-all border border-surface-variant flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" /> Replay Audio
        </button>

        <button 
          onClick={handleNextWord}
          disabled={isSubmitting}
          className="flex-1 py-4 px-8 rounded-2xl bg-primary text-on-primary font-display text-base font-bold flex items-center justify-center gap-3 transition-all shadow-md hover:bg-primary-container hover:text-on-primary-container active:scale-95 cursor-pointer"
        >
          {currentWordIdx < activeWords.length - 1 ? (
            <>
              Next Practice Word ({currentWordIdx + 2}/{activeWords.length}) <ChevronRight className="w-5 h-5" />
            </>
          ) : (
            <>
              <Award className="w-5 h-5" /> {isSubmitting ? 'Saving Progress…' : 'Complete Practice Clinic 🎉'}
            </>
          )}
        </button>
      </div>
    </main>
  );
}
