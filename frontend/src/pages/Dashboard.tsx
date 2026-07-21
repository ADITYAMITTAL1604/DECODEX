import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { apiFetch, useApiQuery } from '../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [consentStatus, setConsentStatus] = useState<{ invite_code: string | null; consent_granted: boolean; consent_date: string | null; pending_parent_name?: string | null; pending_parent_email?: string | null } | null>(null);
  const [approving, setApproving] = useState(false);

  const { data: trendsData, loading } = useApiQuery<any>('/analytics/student/trends');

  const fetchConsentStatus = () => {
    if (user?.role !== 'student') return;
    apiFetch<{ invite_code: string | null; consent_granted: boolean; consent_date: string | null; pending_parent_name?: string | null; pending_parent_email?: string | null }>('/students/me/consent-status')
      .then(setConsentStatus)
      .catch(() => setConsentStatus(null));
  };

  useEffect(() => {
    fetchConsentStatus();
  }, [user?.role]);

  const handleApproveConsent = async () => {
    setApproving(true);
    try {
      await apiFetch('/consent/approve', { method: 'POST' });
      fetchConsentStatus();
    } catch (err) {
      console.error('Failed to approve consent', err);
    } finally {
      setApproving(false);
    }
  };

  return (
    <main className="flex-grow w-full max-w-[1000px] mx-auto px-container-padding py-8 sm:py-12">
      <section className="mb-8 sm:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-4xl md:text-5xl font-extrabold text-primary mb-2">Welcome back, {user?.display_name}!</h1>
          <p className="font-body text-base sm:text-xl text-on-surface-variant">Ready to grow your reading skills today?</p>
        </div>
        <div className="inline-flex items-center gap-2 glass-badge px-4 py-2 rounded-full border border-primary/20 w-max">
          <span className="material-symbols-outlined text-secondary text-sm">school</span>
          <span className="font-display text-xs font-bold tracking-[0.08em] uppercase text-on-surface-variant">{user?.role}</span>
        </div>
      </section>

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
            onClick={handleApproveConsent}
            disabled={approving}
            className="h-12 px-6 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-display text-sm font-bold uppercase tracking-[0.08em] transition-all shadow-md active:scale-95 disabled:opacity-60 flex-shrink-0 cursor-pointer"
          >
            {approving ? 'Approving…' : 'Approve Recording Consent'}
          </button>
        </section>
      ) : null}

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

      <section className="grid grid-cols-1 md:grid-cols-2 gap-card-gap mb-12 sm:mb-16">
        {/* Student actions */}
        {(user?.role === 'student' || user?.role === 'admin') && (
          <Link to="/passages" className="glass-card glass-card-hover rounded-3xl p-8 flex flex-col items-center text-center group focus:outline-none focus:ring-4 focus:ring-primary/20">
            <div className="h-16 w-16 bg-primary-container/15 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary-container/25 transition-colors shadow-inner">
              <span className="material-symbols-outlined text-4xl text-primary" style={{fontVariationSettings: "'FILL' 1"}}>book</span>
            </div>
            <h2 className="font-display text-3xl font-bold text-on-surface mb-3 group-hover:text-primary transition-colors">Start Reading</h2>
            <p className="font-body text-lg text-on-surface-variant">Select a passage and practice reading aloud.</p>
          </Link>
        )}

        {/* Teacher actions */}
        {(user?.role === 'teacher' || user?.role === 'admin') && (
          <Link to="/teacher/dashboard" className="glass-card glass-card-hover rounded-3xl p-8 flex flex-col items-center text-center group focus:outline-none focus:ring-4 focus:ring-secondary/20">
            <div className="h-16 w-16 bg-secondary-container/15 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-secondary-container/25 transition-colors shadow-inner">
              <span className="material-symbols-outlined text-4xl text-secondary" style={{fontVariationSettings: "'FILL' 1"}}>group</span>
            </div>
            <h2 className="font-display text-3xl font-bold text-on-surface mb-3 group-hover:text-secondary transition-colors">My Students</h2>
            <p className="font-body text-lg text-on-surface-variant">Manage your classroom and view aggregate reports.</p>
          </Link>
        )}
      </section>

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
