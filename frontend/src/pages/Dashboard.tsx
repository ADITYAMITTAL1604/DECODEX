import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { apiFetch, useApiQuery } from '../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DexAvatar from '../components/DexAvatar';
import { TUTOR_NAME } from '../lib/constants';

// ---------------------------------------------------------------------------
// Health Score Gauge Component — animated SVG radial gauge
// ---------------------------------------------------------------------------
function HealthScoreGauge({ score, riskLevel }: { score: number; riskLevel: string }) {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const dashOffset = circumference - progress;

  const colorMap: Record<string, string> = {
    excellent: '#10b981',
    good: '#22c55e',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  };
  const color = colorMap[riskLevel] || '#006474';

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-surface-container-high opacity-30" />
        <circle
          cx="72" cy="72" r={radius} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl font-extrabold" style={{ color }}>{score}</span>
        <span className="font-display text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{riskLevel}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const { user } = useAuth();

  const [consentStatus, setConsentStatus] = useState<{ invite_code: string | null; consent_granted: boolean; consent_date: string | null; pending_parent_name?: string | null; pending_parent_email?: string | null } | null>(null);
  const [approving, setApproving] = useState(false);

  const { data: trendsData, loading } = useApiQuery<any>('/analytics/student/trends');
  const { data: healthData } = useApiQuery<any>(user?.role === 'student' ? `/health-score/${user?.id}` : '/health-score/skip');
  const { data: gamData } = useApiQuery<any>(user?.role === 'student' ? `/gamification/${user?.id}/profile` : '/gamification/skip');
  const { data: pathData } = useApiQuery<any>(user?.role === 'student' ? `/learning-paths/${user?.id}` : '/learning-paths/skip');
  const { data: achievementData } = useApiQuery<any>(user?.role === 'student' ? `/gamification/${user?.id}/achievements` : '/gamification/skip');

  const healthScore = healthData?.healthScore;
  const gamProfile = gamData?.profile;
  const learningPath = pathData?.learningPath;
  const achievements = achievementData?.achievements || [];
  const earnedAchievements = achievements.filter((a: any) => a.earned);

  const fetchConsentStatus = () => {
    if (user?.role !== 'student') return;
    apiFetch<{ invite_code: string | null; consent_granted: boolean; consent_date: string | null; pending_parent_name?: string | null; pending_parent_email?: string | null }>('/students/me/consent-status')
      .then(setConsentStatus)
      .catch(() => setConsentStatus(null));
  };

  useEffect(() => {
    if (user?.role === 'student') {
      fetchConsentStatus();
    }
  }, [user?.role]);

  // Role-based dashboard redirects (placed after all hooks)
  if (user?.role === 'parent') {
    return <Navigate to="/parent/home" replace />;
  }
  if (user?.role === 'teacher') {
    return <Navigate to="/teacher/dashboard" replace />;
  }

  const handleRequestConsentEmail = async () => {
    setApproving(true);
    try {
      // Sends a consent email to the linked parent so they can complete
      // date-of-birth verification via the secure email link.
      // POST /consent/approve has been removed — consent can only be granted
      // by a parent through the token-based email flow.
      await apiFetch('/consent/request', { method: 'POST', body: JSON.stringify({ student_id: user!.id }) });
      fetchConsentStatus();
    } catch (err) {
      console.error('Failed to request consent email', err);
    } finally {
      setApproving(false);
    }
  };

  return (
    <main className="flex-grow w-full max-w-[1000px] mx-auto px-container-padding py-8 sm:py-12 relative z-10">
      <section className="mb-8 sm:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold text-primary mb-2">
            <span className="[data-theme=student]_&:hidden">{/* teacher/default */}</span>
            Welcome back, {user?.display_name}! 🌟
          </h1>
          <p className="font-body text-base sm:text-xl text-on-surface-variant">Ready to grow your reading skills today?</p>
        </div>
        {gamProfile && (
          <div className="inline-flex items-center gap-3 glass-badge px-4 py-2 rounded-full border border-primary/20 w-max">
            <span className="material-symbols-outlined text-primary text-sm">star</span>
            <span className="font-display text-xs font-bold tracking-[0.06em] text-on-surface">Level {gamProfile.level}</span>
            <span className="text-on-surface-variant">•</span>
            <span className="font-display text-xs font-bold tracking-[0.06em] text-primary">{gamProfile.xp} XP</span>
            {gamProfile.currentStreak > 0 && (
              <>
                <span className="text-on-surface-variant">•</span>
                <span className="font-display text-xs font-bold text-amber-600">🔥 {gamProfile.currentStreak} day streak</span>
              </>
            )}
          </div>
        )}
      </section>

      {/* Dex Companion Banner on Student Dashboard */}
      {user?.role === 'student' && (
        <section className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-white/95 via-blue-50/60 to-indigo-50/60 border-2 border-blue-200/50 shadow-[0_8px_32px_rgba(37,99,235,0.12)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            <DexAvatar
              state="idle"
              size="md"
              showCaptionBubble={false}
            />
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/30 text-secondary font-display text-[10px] font-bold uppercase tracking-wider mb-2">
                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                Your AI Voice Companion
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-on-surface">
                Hi {user.display_name.split(' ')[0]}! I'm {TUTOR_NAME}!
              </h2>
              <p className="font-body text-sm text-on-surface-variant mt-1 max-w-md">
                Let's practice reading together today! Remember: <strong>you must practice reading daily</strong> — even if not a whole story, reading even a small part of a story every day will help you continuously improve yourself!
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
            <Link
              to="/stories"
              className="w-full sm:w-auto h-12 px-8 rounded-full btn-clay flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-lg">auto_stories</span>
              Read with {TUTOR_NAME}
            </Link>
          </div>
        </section>
      )}

      {/* Consent banner (unchanged behavior) */}
      {user?.role === 'student' && consentStatus && !consentStatus.consent_granted && consentStatus.pending_parent_name ? (
        <section className="mb-8 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-900 font-display text-xs font-bold uppercase tracking-wider mb-2">
              <span className="material-symbols-outlined text-sm">notifications_active</span> Pending Consent Request
            </span>
            <h2 className="font-display text-xl font-bold text-on-surface">Parent Linked: {consentStatus.pending_parent_name}</h2>
            <p className="font-body text-sm text-on-surface-variant mt-1">Your parent ({consentStatus.pending_parent_email}) linked to your account and requested voice recording consent.</p>
          </div>
          <button
            onClick={handleRequestConsentEmail}
            disabled={approving}
            className="h-12 px-8 rounded-full btn-clay flex items-center justify-center gap-2 text-sm uppercase tracking-[0.08em] disabled:opacity-60 flex-shrink-0 cursor-pointer"
          >
            {approving ? 'Sending Email…' : 'Send Consent Email to Parent'}
          </button>
        </section>
      ) : null}

      {/* V2: Health Score + Gamification Hero Row */}
      {(user?.role === 'student' || user?.role === 'admin') && healthScore && (
        <section className="mb-10 grid gap-card-gap grid-cols-1 md:grid-cols-3">
          {/* Health Score Card */}
          <div className="glass-card rounded-3xl p-6 border border-white/80 flex flex-col items-center text-center shadow-sm">
            <p className="font-display text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant mb-3">Reading Health Score</p>
            <HealthScoreGauge score={healthScore.score} riskLevel={healthScore.riskLevel} />
            <p className="font-body text-sm text-on-surface-variant mt-3">
              {healthScore.score >= 75 ? 'Great progress! Keep it up.' : healthScore.score >= 50 ? 'You\'re improving! Practice daily.' : 'Let\'s work on building your skills.'}
            </p>
          </div>

          {/* XP & Level Card */}
          {gamProfile && (
            <div className="glass-card rounded-3xl p-6 border border-white/80 flex flex-col shadow-sm">
              <p className="font-display text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant mb-3">Your Progress</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-container/20 flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-2xl text-primary" style={{fontVariationSettings: "'FILL' 1"}}>military_tech</span>
                </div>
                <div>
                  <p className="font-display text-2xl font-extrabold text-primary">Level {gamProfile.level}</p>
                  <p className="font-body text-xs text-on-surface-variant">{gamProfile.xpToNextLevel} XP to next level</p>
                </div>
              </div>
              {/* XP Progress Bar */}
              <div className="w-full bg-surface-container-high h-3 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-700"
                  style={{ width: `${gamProfile.levelProgress}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="font-display text-lg font-bold text-on-surface">{gamProfile.totalSessions}</p>
                  <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider">Sessions</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-on-surface">{gamProfile.totalDrillsCompleted}</p>
                  <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider">Drills</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-amber-600">{gamProfile.currentStreak}</p>
                  <p className="font-body text-[10px] text-on-surface-variant uppercase tracking-wider">Day Streak</p>
                </div>
              </div>
            </div>
          )}

          {/* Achievements Showcase */}
          <div className="glass-card rounded-3xl p-6 border border-white/80 flex flex-col shadow-sm">
            <p className="font-display text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant mb-3">Achievements</p>
            {earnedAchievements.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 flex-grow">
                {earnedAchievements.slice(0, 6).map((ach: any) => (
                  <div key={ach.id} className="flex flex-col items-center text-center p-2 rounded-xl bg-primary-container/10 hover:bg-primary-container/20 transition-colors">
                    <span className="material-symbols-outlined text-2xl text-primary mb-1" style={{fontVariationSettings: "'FILL' 1"}}>{ach.icon}</span>
                    <span className="font-display text-[9px] font-bold text-on-surface leading-tight">{ach.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2">emoji_events</span>
                <p className="font-body text-sm text-on-surface-variant">Complete sessions to earn badges!</p>
              </div>
            )}
            {achievements.length > 0 && (
              <p className="font-body text-xs text-on-surface-variant mt-3 text-center">{earnedAchievements.length} / {achievements.length} earned</p>
            )}
          </div>
        </section>
      )}

      {/* Learning Path Preview */}
      {(user?.role === 'student' || user?.role === 'admin') && learningPath && (
        <section className="mb-10">
          <div className="glass-card rounded-3xl p-6 border border-white/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center shadow-inner">
                  <span className="material-symbols-outlined text-xl text-primary" style={{fontVariationSettings: "'FILL' 1"}}>route</span>
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-on-surface">{learningPath.title}</p>
                  <p className="font-body text-xs text-on-surface-variant">Week {learningPath.currentWeek} of {learningPath.totalWeeks}</p>
                </div>
              </div>
              <Link to="/learning-path" className="text-primary font-display text-xs font-bold uppercase tracking-wider hover:underline">View Plan →</Link>
            </div>
            {/* Mini progress bar */}
            <div className="flex gap-1.5">
              {learningPath.weeks?.map((week: any, i: number) => (
                <div key={i} className={`h-2 flex-1 rounded-full transition-colors ${week.completed ? 'bg-primary' : i + 1 === learningPath.currentWeek ? 'bg-primary/40 animate-pulse' : 'bg-surface-container-high'}`} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Consent + Invite Section */}
      {user?.role === 'student' && consentStatus ? (
        <section className="mb-10 grid gap-4 md:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl glass-card p-6 border border-white/80">
            <p className="font-display text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">Share with a parent</p>
            <p className="mt-2 font-body text-on-surface-variant">Ask a parent to enter this invite code in their Decodex account.</p>
            <p className="mt-4 inline-block rounded-2xl bg-white/90 shadow-sm border border-primary/20 px-4 py-3 font-display text-xl font-bold tracking-[0.12em] text-primary">{consentStatus.invite_code || 'Invite code unavailable'}</p>
          </div>
          <div className={`rounded-3xl p-6 backdrop-blur-md shadow-sm border ${consentStatus.consent_granted ? 'bg-primary-fixed/80 text-on-primary-fixed border-primary/20' : 'bg-secondary-fixed/80 text-on-secondary-fixed border-secondary/20'}`}>
            <p className="font-display text-xs font-bold uppercase tracking-[0.08em]">Recording consent</p>
            <p className="mt-2 font-body text-lg">{consentStatus.consent_granted ? 'Parent consent is confirmed. Recording is ready when you are.' : 'Recording is locked until a parent confirms consent.'}</p>
          </div>
        </section>
      ) : null}

      {/* Action Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-card-gap mb-12 sm:mb-16">
        <Link to="/passages" className="glass-card glass-card-hover rounded-3xl p-6 flex flex-col items-center text-center group focus:outline-none focus:ring-4 focus:ring-primary/20 border-0">
          <div className="h-16 w-16 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
            <span className="material-symbols-outlined text-3xl text-primary" style={{fontVariationSettings: "'FILL' 1"}}>book</span>
          </div>
          <h2 className="font-display text-xl font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">Start Reading</h2>
          <p className="font-body text-sm text-on-surface-variant">Choose a passage and read aloud.</p>
        </Link>

        <Link to="/stories" className="glass-card glass-card-hover rounded-3xl p-6 flex flex-col items-center text-center group focus:outline-none focus:ring-4 focus:ring-secondary/20 border-0">
          <div className="h-16 w-16 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
            <span className="material-symbols-outlined text-3xl text-secondary" style={{fontVariationSettings: "'FILL' 1"}}>auto_stories</span>
          </div>
          <h2 className="font-display text-xl font-bold text-on-surface mb-1 group-hover:text-secondary transition-colors">AI Stories</h2>
          <p className="font-body text-sm text-on-surface-variant">Practice with stories made for you.</p>
        </Link>

        <Link to="/learning-path" className="glass-card glass-card-hover rounded-3xl p-6 flex flex-col items-center text-center group focus:outline-none focus:ring-4 focus:ring-primary/20 border-0">
          <div className="h-16 w-16 bg-gradient-to-br from-pink-400/20 to-rose-500/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
            <span className="material-symbols-outlined text-3xl text-primary" style={{fontVariationSettings: "'FILL' 1"}}>route</span>
          </div>
          <h2 className="font-display text-xl font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">Learning Path</h2>
          <p className="font-body text-sm text-on-surface-variant">Follow your personalized plan.</p>
        </Link>
      </section>

      {/* Progress Charts */}
      {(user?.role === 'student' || user?.role === 'admin') && (
        <section className="mb-16">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-on-surface mb-8">Your Progress</h2>
          
          {loading ? (
             <div className="text-on-surface-variant font-body">Loading charts...</div>
          ) : trendsData?.trends && trendsData.trends.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-card-gap">
              <div className="glass-card rounded-3xl p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">Reading Speed (WPM)</h3>
                  <span className="material-symbols-outlined text-primary">trending_up</span>
                </div>
                <div className="flex-grow h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendsData.trends.map((t: any, i: number) => ({ name: `S${i+1}`, wpm: t.words_per_minute != null ? Math.round(t.words_per_minute) : 0 }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1d8d4" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6f797c', fontFamily: 'Nunito Sans'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#6f797c', fontFamily: 'Nunito Sans'}} />
                      <Tooltip contentStyle={{ borderRadius: '16px', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 8px 24px rgba(45, 41, 38, 0.1)', fontFamily: 'Nunito Sans' }} />
                      <Line type="monotone" dataKey="wpm" stroke="#006474" strokeWidth={3} dot={{ r: 4, fill: '#006474' }} activeDot={{ r: 6, fill: '#006474' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card rounded-3xl p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">Error Rate (%)</h3>
                  <span className="material-symbols-outlined text-tertiary">trending_down</span>
                </div>
                <div className="flex-grow h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendsData.trends.map((t: any, i: number) => ({ name: `S${i+1}`, errorRate: Math.round(t.error_rate * 100) }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1d8d4" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6f797c', fontFamily: 'Nunito Sans'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#6f797c', fontFamily: 'Nunito Sans'}} />
                      <Tooltip contentStyle={{ borderRadius: '16px', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 8px 24px rgba(45, 41, 38, 0.1)', fontFamily: 'Nunito Sans' }} />
                      <Line type="monotone" dataKey="errorRate" stroke="#7f5018" strokeWidth={3} dot={{ r: 4, fill: '#7f5018' }} activeDot={{ r: 6, fill: '#7f5018' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 glass-card rounded-3xl p-8 border border-white/80 text-center flex flex-col items-center justify-center">
              <div className="w-20 h-20 mb-4 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center shadow-inner">
                <span className="material-symbols-outlined text-5xl" style={{fontVariationSettings: "'FILL' 1"}}>menu_book</span>
              </div>
              <h3 className="font-display text-2xl font-bold text-on-surface mb-2">No sessions yet</h3>
              <p className="font-body text-lg text-on-surface-variant">Click "Start Reading" above to begin your journey!</p>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
