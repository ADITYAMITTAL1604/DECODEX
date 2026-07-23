import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, useApiQuery } from '../lib/api';

interface ActiveActivity {
  pathId: string;
  weekNumber: number;
  dayNumber: number;
  title: string;
  activityType: 'drill' | 'story' | 'reading' | 'phonics';
  targetSkill: string;
  description: string;
}

export default function LearningPathPage() {
  const { user } = useAuth();
  const studentId = user?.id;
  const navigate = useNavigate();

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeActivity, setActiveActivity] = useState<ActiveActivity | null>(null);

  const { data, loading, error, refetch } = useApiQuery<any>(`/learning-paths/${studentId}`);
  const learningPath = data?.learningPath;

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg(null);
    try {
      await apiFetch(`/learning-paths/${studentId}/generate`, { method: 'POST' });
      refetch();
    } catch (err: any) {
      if (err.code === 'INSUFFICIENT_SESSIONS') {
        setErrorMsg(err.message);
      } else {
        setErrorMsg(err.message || 'Failed to generate learning path');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleCompleteDay = async (pathId: string, weekNumber: number, dayNumber: number) => {
    try {
      await apiFetch(`/learning-paths/${pathId}/weeks/${weekNumber}/days/${dayNumber}/complete`, { method: 'PATCH' });
      refetch();
    } catch (err) {
      console.error('Failed to complete day task:', err);
    }
  };

  const handleLaunchActivity = (weekNumber: number, day: any) => {
    if (day.activityType === 'reading') {
      navigate('/passages');
    } else if (day.activityType === 'story') {
      navigate('/stories');
    } else {
      setActiveActivity({
        pathId: learningPath.id,
        weekNumber,
        dayNumber: day.dayNumber,
        title: day.title,
        activityType: day.activityType,
        targetSkill: day.targetSkill || 'REV',
        description: day.description,
      });
    }
  };

  if (loading) return <div className="p-8 text-center text-on-surface-variant font-body">Analyzing diagnostic context...</div>;
  if (error) return <div className="p-8 text-center text-error font-body">Error loading learning path: {error.message}</div>;

  const canGenerate = learningPath?.canGenerate ?? true;
  const currentSessions = learningPath?.completedSessionsCount ?? 0;
  const requiredSessions = learningPath?.requiredSessionsCount ?? 2;
  const hasPath = learningPath && learningPath.status === 'active' && learningPath.weeks?.length > 0;

  return (
    <main className="flex-grow w-full max-w-[1000px] mx-auto px-container-padding py-8 sm:py-12 text-on-surface">
      <Link to="/" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary font-display text-sm font-bold tracking-[0.08em] uppercase transition-all group mb-6">
        <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
        Back to Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-container/20 text-primary font-display text-[10px] font-bold uppercase tracking-widest mb-2">
            <span className="material-symbols-outlined text-sm">route</span>
            Personalized Curriculum
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-on-surface">Your Reading Learning Path</h1>
          <p className="font-body text-base text-on-surface-variant mt-1">A day-by-day plan tailored to your diagnostic assessment context</p>
        </div>

        {hasPath && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="h-12 px-6 rounded-2xl bg-surface-container-high text-on-surface font-display text-xs font-bold uppercase tracking-wider transition-all hover:bg-surface-container-highest active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {generating ? 'Regenerating…' : 'Re-Analyze & Update Plan'}
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-900 font-body text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-display font-bold text-base">Diagnostic Context Needed</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
          <button
            onClick={() => navigate('/passages')}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-display text-xs font-bold uppercase tracking-wider transition-all shadow-md shrink-0 cursor-pointer"
          >
            Take Reading Assessment ({currentSessions}/2) →
          </button>
        </div>
      )}

      {/* Gating Screen if under 2 sessions */}
      {!canGenerate && !hasPath && (
        <div className="glass-card rounded-3xl p-8 sm:p-12 border border-amber-500/30 text-center flex flex-col items-center justify-center shadow-lg bg-amber-500/5">
          <div className="w-20 h-20 mb-4 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>assignment_late</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-200/60 text-amber-900 font-display text-xs font-bold uppercase tracking-wider mb-2">
            Assessment Required ({currentSessions} / {requiredSessions} Completed)
          </span>
          <h3 className="font-display text-2xl font-bold text-on-surface mb-2">Complete Diagnostic Tests First</h3>
          <p className="font-body text-base text-on-surface-variant max-w-lg mb-6 leading-relaxed">
            To build a truly personalized day-by-day plan, Decodex needs at least {requiredSessions} diagnostic reading sessions to analyze your specific speech, speed, and error patterns.
          </p>
          <button
            onClick={() => navigate('/passages')}
            className="h-14 px-8 rounded-2xl bg-primary text-on-primary font-display text-base font-bold uppercase tracking-wider transition-all shadow-lg hover:bg-primary-container hover:text-on-primary-container active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined">mic</span>
            Take Diagnostic Test #{currentSessions + 1}
          </button>
        </div>
      )}

      {/* Ready to generate initial plan */}
      {canGenerate && !hasPath && (
        <div className="glass-card rounded-3xl p-12 border border-white/80 text-center flex flex-col items-center justify-center">
          <div className="w-20 h-20 mb-4 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>map</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-display text-xs font-bold uppercase tracking-wider mb-2">
            Context Ready ({currentSessions} Diagnostic Sessions Analyzed)
          </span>
          <h3 className="font-display text-2xl font-bold text-on-surface mb-2">Generate Your Personalized Plan</h3>
          <p className="font-body text-base text-on-surface-variant max-w-md mb-6">
            Click below to construct your custom 4-week, 20-day Orton-Gillingham intervention roadmap based on your diagnostic results.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="h-14 px-8 rounded-2xl bg-primary text-on-primary font-display text-base font-bold uppercase tracking-wider transition-all shadow-lg hover:bg-primary-container hover:text-on-primary-container active:scale-95 disabled:opacity-60 cursor-pointer flex items-center gap-2"
          >
            <span className="material-symbols-outlined">{generating ? 'hourglass_top' : 'auto_awesome'}</span>
            {generating ? 'Constructing Plan…' : 'Generate My 20-Day Plan'}
          </button>
        </div>
      )}

      {/* Active Day-by-Day Learning Path */}
      {hasPath && (
        <div className="space-y-8">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary-container/20 text-primary font-display text-xs font-bold uppercase tracking-wider mb-2">
                Week {learningPath.currentWeek} of {learningPath.totalWeeks} • 20 Interactive Days
              </span>
              <h2 className="font-display text-2xl font-bold text-on-surface">{learningPath.title}</h2>
              <p className="font-body text-sm text-on-surface-variant mt-2 max-w-2xl">{learningPath.planSummary}</p>
            </div>
            <div className="w-full md:w-48 bg-surface-container-low p-4 rounded-2xl border border-surface-container-highest flex flex-col items-center text-center shrink-0">
              <span className="font-display text-3xl font-extrabold text-primary">
                {Math.round(
                  (learningPath.weeks.flatMap((w: any) => w.days || []).filter((d: any) => d.completed).length /
                    Math.max(1, learningPath.weeks.flatMap((w: any) => w.days || []).length)) * 100
                )}%
              </span>
              <span className="font-body text-xs text-on-surface-variant uppercase tracking-wider">Overall Progress</span>
            </div>
          </div>

          <div className="space-y-6">
            {learningPath.weeks.map((week: any) => (
              <div
                key={week.id || week.weekNumber}
                className={`glass-card rounded-3xl p-6 sm:p-8 border transition-all ${
                  week.completed
                    ? 'border-emerald-500/40 bg-emerald-50/20'
                    : week.weekNumber === learningPath.currentWeek
                    ? 'border-primary/40 bg-white/60 shadow-md ring-2 ring-primary/20'
                    : 'border-white/80 opacity-80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-surface-container-highest">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-display text-base font-extrabold shadow-inner ${
                        week.completed
                          ? 'bg-emerald-600 text-white'
                          : week.weekNumber === learningPath.currentWeek
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {week.completed ? <span className="material-symbols-outlined text-xl">check</span> : week.weekNumber}
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold text-on-surface">{week.focusArea}</h3>
                      <p className="font-body text-xs text-on-surface-variant">{week.description}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {(week.days || []).map((day: any) => (
                    <div
                      key={day.dayNumber}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        day.completed
                          ? 'bg-emerald-100/40 border-emerald-300'
                          : 'bg-white/50 border-surface-container-highest hover:bg-white/80 shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className={`px-2 py-0.5 rounded-md font-display text-[9px] font-bold uppercase tracking-wider ${
                            day.completed ? 'bg-emerald-600 text-white' : 'bg-primary-container/20 text-primary'
                          }`}>
                            Day {day.dayNumber}
                          </span>
                          <span className="font-body text-[9px] text-outline">~{day.estimatedMinutes}m</span>
                        </div>
                        <h4 className="font-display text-xs font-bold text-on-surface mb-1 line-clamp-2">{day.title}</h4>
                        <p className="font-body text-[10px] text-on-surface-variant leading-relaxed line-clamp-3 mb-3">{day.description}</p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-surface-container-highest">
                        <button
                          onClick={() => handleLaunchActivity(week.weekNumber, day)}
                          className="w-full py-1.5 px-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-display text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[12px]">volume_up</span>
                          {day.actionLabel || 'Launch Activity'}
                        </button>

                        {!day.completed ? (
                          <button
                            onClick={() => handleCompleteDay(learningPath.id, week.weekNumber, day.dayNumber)}
                            className="w-full py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-display text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[12px]">check</span>
                            Complete (+25 XP)
                          </button>
                        ) : (
                          <span className="w-full py-1 block text-center font-display text-[10px] font-bold uppercase text-emerald-800 bg-emerald-100 rounded-xl">
                            ✓ Done (+25 XP)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Activity Modal with Voice Test Engine */}
      {activeActivity && (
        <InteractiveActivityModal
          activity={activeActivity}
          onClose={() => setActiveActivity(null)}
          onComplete={async () => {
            await handleCompleteDay(activeActivity.pathId, activeActivity.weekNumber, activeActivity.dayNumber);
            setActiveActivity(null);
          }}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Voice-Enabled Interactive Activity Modal (Speech Read-Aloud + Voice Engine)
// ---------------------------------------------------------------------------
function InteractiveActivityModal({
  activity,
  onClose,
  onComplete,
}: {
  activity: ActiveActivity;
  onClose: () => void;
  onComplete: () => Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [spokenText, setSpokenText] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voicePassed, setVoicePassed] = useState(false);

  // Drill questions containing TTS read aloud & live speech input requirements
  const DRILL_QUESTIONS = [
    { type: 'choice', target: 'b vs d Discrimination', question: 'Which letter matches the sound /b/ as in "ball"?', options: ['b', 'd', 'p', 'q'], correct: 'b', readText: 'Which letter matches the sound b as in ball?' },
    { type: 'voice', target: 'Live Voice Test Engine', question: 'Read aloud into your microphone: "ball"', expectedSpeech: 'ball', readText: 'Read aloud into your microphone: ball' },
    { type: 'choice', target: 'Reversal Identification', question: 'Select the correctly spelled word:', options: ['was', 'saw', 'waz', 'zaw'], correct: 'was', readText: 'Select the correctly spelled word.' },
    { type: 'voice', target: 'Live Voice Test Engine', question: 'Read aloud into your microphone: "street"', expectedSpeech: 'street', readText: 'Read aloud into your microphone: street' },
    { type: 'choice', target: 'Blend Building', question: 'Which letter cluster completes "_ _ eet" (street)?', options: ['str', 'spl', 'br', 'cl'], correct: 'str', readText: 'Which letter cluster completes street?' },
  ];

  const currentQ = DRILL_QUESTIONS[step % DRILL_QUESTIONS.length];

  // Auto-read question aloud when step changes
  useEffect(() => {
    speakText(currentQ.readText);
    setSelectedOption(null);
    setSpokenText(null);
    setVoiceError(null);
    setVoicePassed(false);
  }, [step]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.85; // Slower clear voice for dyslexia practice
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startVoiceInput = () => {
    setListening(true);
    setVoiceError(null);
    setSpokenText(null);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback mock prompt for browsers without Web Speech API
      const input = prompt(`[Voice Test Engine] Please type how you pronounced "${currentQ.expectedSpeech}":`);
      evaluateSpeech(input || '');
      setListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        evaluateSpeech(transcript);
        setListening(false);
      };

      recognition.onerror = () => {
        setVoiceError('Could not detect speech clearly. Click microphone and try again!');
        setListening(false);
      };

      recognition.start();
    } catch {
      setVoiceError('Speech recognition unavailable. Please try typing fallback.');
      setListening(false);
    }
  };

  const evaluateSpeech = (spoken: string) => {
    const normSpoken = spoken.trim().toLowerCase().replace(/[.,!?]/g, '');
    const normTarget = (currentQ.expectedSpeech || '').trim().toLowerCase();

    setSpokenText(spoken);

    if (normSpoken === normTarget || normSpoken.includes(normTarget)) {
      setVoicePassed(true);
      setVoiceError(null);
      setScore(s => s + 1);
      speakText('Correct pronunciation!');
    } else {
      setVoicePassed(false);
      setVoiceError(`WRONG PRONUNCIATION! You said "${spoken}", but expected "${normTarget}". You cannot move forward until you pronounce it correctly!`);
      speakText('Try again. Please pronounce correctly.');
    }
  };

  const handleSelectOption = (option: string) => {
    setSelectedOption(option);
    if (option === currentQ.correct) {
      setScore(s => s + 1);
      speakText('Correct!');
    } else {
      speakText('Incorrect answer. Try again.');
    }
  };

  const handleNext = async () => {
    if (step + 1 >= DRILL_QUESTIONS.length) {
      setCompleted(true);
      await onComplete();
    } else {
      setStep(s => s + 1);
    }
  };

  const canProceed = currentQ.type === 'voice' ? voicePassed : (selectedOption !== null && selectedOption === currentQ.correct);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-md p-4">
      <div className="w-full max-w-xl rounded-3xl glass-card border border-white/80 p-8 shadow-2xl bg-white/95 text-on-surface">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-surface-container-highest">
          <div>
            <span className="px-3 py-1 rounded-full bg-primary-container/20 text-primary font-display text-[10px] font-bold uppercase tracking-wider">
              {activity.title} • Voice Test Engine
            </span>
            <h2 className="font-display text-xl font-bold text-on-surface mt-1">Multisensory Orton-Gillingham Exercise</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant cursor-pointer">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {!completed ? (
          <div>
            {/* Progress & Audio Controls */}
            <div className="flex items-center justify-between text-xs font-display font-bold uppercase tracking-wider text-outline mb-4">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-primary">record_voice_over</span>
                Question {step + 1} of {DRILL_QUESTIONS.length}
              </span>
              <button
                onClick={() => speakText(currentQ.readText)}
                className="px-3 py-1 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1 text-[10px] cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">volume_up</span>
                Re-play Audio
              </button>
            </div>

            {/* Question Card */}
            <div className="p-6 rounded-2xl bg-surface-container-low border border-surface-container-high text-center mb-6">
              <span className="font-display text-xs font-bold text-primary uppercase tracking-widest block mb-2">{currentQ.target}</span>
              <p className="font-display text-xl font-bold text-on-surface mb-2">{currentQ.question}</p>
            </div>

            {/* Choice Questions */}
            {currentQ.type === 'choice' && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {currentQ.options?.map(option => (
                  <button
                    key={option}
                    onClick={() => handleSelectOption(option)}
                    disabled={selectedOption !== null && selectedOption === currentQ.correct}
                    className={`p-4 rounded-2xl font-display text-xl font-extrabold transition-all cursor-pointer border ${
                      selectedOption === option
                        ? option === currentQ.correct
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                          : 'bg-red-600 text-white border-red-600 shadow-md'
                        : selectedOption !== null && option === currentQ.correct
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-white hover:bg-primary-container/10 border-surface-container-highest text-on-surface'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* Voice Input Questions */}
            {currentQ.type === 'voice' && (
              <div className="text-center space-y-4 mb-6">
                <button
                  onClick={startVoiceInput}
                  disabled={listening || voicePassed}
                  className={`h-20 px-8 rounded-3xl font-display text-base font-extrabold uppercase tracking-wider transition-all shadow-lg cursor-pointer flex items-center justify-center gap-3 mx-auto ${
                    voicePassed
                      ? 'bg-emerald-600 text-white cursor-default'
                      : listening
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-3xl">
                    {voicePassed ? 'check_circle' : listening ? 'graphic_eq' : 'mic'}
                  </span>
                  {voicePassed ? '✓ Pronunciation Approved!' : listening ? 'Listening… Speak Now!' : 'Click & Speak Answer'}
                </button>

                {spokenText && (
                  <p className="font-body text-xs text-on-surface-variant">
                    Voice Analysis Result: <strong className="font-semibold text-on-surface">"{spokenText}"</strong>
                  </p>
                )}

                {voiceError && (
                  <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-800 font-body text-xs leading-relaxed">
                    <span className="font-bold block mb-1">❌ Speech Mismatch</span>
                    {voiceError}
                  </div>
                )}
              </div>
            )}

            {/* Next Button — Blocked until passed */}
            <div className="flex justify-between items-center pt-4 border-t border-surface-container-highest">
              <span className="font-body text-xs text-on-surface-variant">
                {!canProceed ? '⚠️ Master current question to continue' : '✓ Ready for next step!'}
              </span>
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className="h-12 px-6 rounded-2xl bg-primary text-on-primary font-display text-xs font-bold uppercase tracking-wider transition-all shadow-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-container hover:text-on-primary-container cursor-pointer flex items-center gap-2"
              >
                {step + 1 >= DRILL_QUESTIONS.length ? 'Finish & Claim +25 XP' : 'Next Question →'}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <span className="material-symbols-outlined text-6xl text-emerald-600 mb-2">military_tech</span>
            <h3 className="font-display text-2xl font-extrabold text-on-surface mb-2">Voice Exercise Complete!</h3>
            <p className="font-body text-base text-on-surface-variant mb-6">
              You passed all speech & phonics questions and earned <strong className="text-primary font-bold">+25 XP</strong> for your daily plan!
            </p>
            <button
              onClick={onClose}
              className="h-12 px-8 rounded-2xl bg-primary text-on-primary font-display text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
            >
              Continue Learning Path
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
