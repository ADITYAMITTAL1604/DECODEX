import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

interface LinkedChild {
  id: string;
  display_name: string;
  grade_level: number | null;
  consent_granted: boolean;
  consent_date: string | null;
  withdrawn_at: string | null;
  hard_delete_at: string | null;
}

interface LinkResponse {
  student: Pick<LinkedChild, 'id' | 'display_name' | 'grade_level'>;
}

export default function ParentHome() {
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<LinkedChild | null>(null);
  const [notice, setNotice] = useState<{ studentId: string; message: string } | null>(null);
  const [error, setError] = useState('');

  const loadChildren = useCallback(async () => {
    try {
      const response = await apiFetch<{ children: LinkedChild[] }>('/consent/children');
      setChildren(response.children);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load linked children.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChildren();
  }, [loadChildren]);

  const resendConsentEmail = async (studentId: string, studentName: string) => {
    setError('');
    setResendingId(studentId);
    try {
      await apiFetch('/consent/request', { method: 'POST', body: JSON.stringify({ student_id: studentId }) });
      setNotice({ studentId, message: `A new consent email was sent for ${studentName}.` });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to resend the consent email.');
    } finally {
      setResendingId(null);
    }
  };

  const grantConsentInApp = async (studentId: string, studentName: string) => {
    setError('');
    setResendingId(studentId);
    try {
      await apiFetch('/consent/approve', {
        method: 'POST',
        body: JSON.stringify({ student_id: studentId }),
      });
      setNotice({ studentId, message: `Recording consent was granted for ${studentName}.` });
      await loadChildren();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to grant consent.');
    } finally {
      setResendingId(null);
    }
  };

  const linkChild = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setNotice(null);
    setLinking(true);
    try {
      const response = await apiFetch<LinkResponse>('/consent/link', {
        method: 'POST',
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      });
      setInviteCode('');
      setNotice({ studentId: response.student.id, message: `Account linked for ${response.student.display_name}! Consent request is active on their student dashboard.` });
      await loadChildren();
    } catch (requestError) {
      const msg = requestError instanceof Error ? requestError.message : 'Unable to link this child.';
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('forbidden')) {
        setError('Your current active session is a Student account. Please click Logout at the top right and log in with your Parent account.');
      } else {
        setError(msg);
      }
    } finally {
      setLinking(false);
    }
  };

  const withdrawConsent = async () => {
    if (!pendingWithdrawal) return;
    setWithdrawing(true);
    setError('');
    try {
      await apiFetch('/consent/withdraw', {
        method: 'POST',
        body: JSON.stringify({ student_id: pendingWithdrawal.id }),
      });
      setNotice({ studentId: pendingWithdrawal.id, message: `Consent was withdrawn for ${pendingWithdrawal.display_name}. Recording is now disabled.` });
      setPendingWithdrawal(null);
      await loadChildren();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to withdraw consent.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[960px] px-container-padding py-8 sm:py-12 text-on-surface">
      <section className="mb-10 rounded-3xl glass-card border border-white/80 p-7 sm:p-9 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-primary"></div>
        <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-secondary">Parent space</p>
        <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-primary">Manage reading consent</h1>
        <p className="mt-3 max-w-2xl font-body text-base sm:text-lg text-on-surface-variant leading-relaxed">Link your child’s account, confirm consent, or withdraw it at any time.</p>
      </section>

      <section className="rounded-3xl glass-card border border-white/80 p-6 sm:p-8 shadow-sm">
        <h2 className="font-display text-2xl font-bold text-on-surface">Link a child</h2>
        <p className="mt-2 font-body text-on-surface-variant text-base">Enter the invite code shown in your child’s Decodex dashboard.</p>
        <form onSubmit={linkChild} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label className="sr-only" htmlFor="invite-code">Child invite code</label>
          <input 
            id="invite-code" 
            value={inviteCode} 
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())} 
            placeholder="INVITE CODE (e.g. DEMO01)" 
            className="h-14 flex-1 rounded-2xl glass-input px-4 font-display text-lg font-bold tracking-[0.12em] text-on-surface placeholder:text-outline/65 outline-none focus:outline-none" 
            required 
          />
          <button 
            disabled={linking} 
            className="h-14 rounded-2xl bg-primary px-6 font-display text-sm font-bold uppercase tracking-[0.08em] text-on-primary transition-all duration-200 hover:bg-on-primary-fixed-variant disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] shadow-lg shadow-primary/20"
          >
            {linking ? 'Linking…' : 'Link child'}
          </button>
        </form>
      </section>

      {error ? (
        <div role="alert" className="mt-6 rounded-2xl bg-error-container/80 backdrop-blur-md p-4 font-body text-sm text-on-error-container border border-error/20">
          {error}
        </div>
      ) : null}
      
      {notice ? (
        <div role="status" className="mt-6 flex flex-col gap-3 rounded-2xl bg-primary-fixed/85 backdrop-blur-md border border-primary/20 p-4 text-on-primary-fixed sm:flex-row sm:items-center sm:justify-between">
          <span className="font-body text-base">{notice.message}</span>
          <button 
            onClick={() => { const child = children.find((item) => item.id === notice.studentId); if (child) void grantConsentInApp(child.id, child.display_name); }} 
            disabled={resendingId === notice.studentId} 
            className="rounded-full bg-primary px-4 py-2 font-display text-xs font-bold uppercase tracking-[0.08em] text-on-primary hover:bg-on-primary-fixed-variant transition-all disabled:opacity-60 shadow-sm cursor-pointer"
          >
            {resendingId === notice.studentId ? 'Granting…' : 'Grant Consent'}
          </button>
        </div>
      ) : null}

      <section className="mt-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-on-surface">Linked children</h2>
            <p className="mt-1 font-body text-on-surface-variant text-base">Consent is required before recording can begin.</p>
          </div>
        </div>
        {loading ? (
          <p className="font-body text-on-surface-variant">Loading linked children…</p>
        ) : null}
        {!loading && children.length === 0 ? (
          <div className="rounded-3xl border border-white/60 glass-card p-8 text-center font-body text-on-surface-variant">
            No children linked yet. Use an invite code to get started.
          </div>
        ) : null}
        <div className="grid gap-4">
          {children.map((child) => {
            const status = getConsentStatus(child);
            return (
              <article key={child.id} className="rounded-3xl glass-card border border-white/80 p-6 shadow-sm">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-display text-xl font-bold text-on-surface">{child.display_name}</h3>
                      <StatusPill status={status} />
                    </div>
                    <p className="mt-2 font-body text-base text-on-surface-variant">
                      {child.grade_level ? `Grade ${child.grade_level}` : 'Grade not set'}
                      {status === 'granted' && child.consent_date ? ` · Confirmed ${formatDate(child.consent_date)}` : ''}
                      {status === 'withdrawn' && child.hard_delete_at ? ` · Data deletion scheduled ${formatDate(child.hard_delete_at)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    {status === 'pending' ? (
                      <button 
                        onClick={() => void grantConsentInApp(child.id, child.display_name)} 
                        disabled={resendingId === child.id} 
                        className="rounded-full bg-primary px-5 py-2 font-display text-xs font-bold uppercase tracking-[0.08em] text-on-primary hover:bg-on-primary-fixed-variant transition-all disabled:opacity-60 shadow-sm cursor-pointer"
                      >
                        {resendingId === child.id ? 'Granting…' : 'Grant Consent'}
                      </button>
                    ) : null}
                    {status === 'granted' ? (
                      <button 
                        onClick={() => setPendingWithdrawal(child)} 
                        className="rounded-full border border-error px-4 py-2 font-display text-xs font-bold uppercase tracking-[0.08em] text-error hover:bg-error/10 transition-colors"
                      >
                        Withdraw consent
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {pendingWithdrawal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="withdraw-title">
          <div className="w-full max-w-lg rounded-3xl glass-card border border-white/80 p-7 shadow-2xl relative overflow-hidden bg-white/95">
            <h2 id="withdraw-title" className="font-display text-2xl font-bold text-on-surface">Withdraw consent?</h2>
            <p className="mt-3 font-body text-base text-on-surface-variant leading-relaxed">
              This disables recording for <strong className="text-on-surface font-semibold">{pendingWithdrawal.display_name}</strong> immediately. Their stored reading data is scheduled for deletion in 30 days unless another parent has active consent.
            </p>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button 
                onClick={() => setPendingWithdrawal(null)} 
                disabled={withdrawing} 
                className="rounded-2xl px-5 py-3 font-display font-bold text-primary hover:bg-primary/5 transition-colors text-base"
              >
                Keep consent
              </button>
              <button 
                onClick={() => void withdrawConsent()} 
                disabled={withdrawing} 
                className="rounded-2xl bg-error px-5 py-3 font-display font-bold uppercase text-sm tracking-[0.08em] text-on-error transition-all duration-200 hover:bg-error/90 active:scale-[0.98] shadow-lg shadow-error/20 disabled:opacity-60"
              >
                {withdrawing ? 'Withdrawing…' : 'Withdraw consent'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function getConsentStatus(child: LinkedChild): 'granted' | 'pending' | 'withdrawn' {
  if (child.withdrawn_at) return 'withdrawn';
  return child.consent_granted ? 'granted' : 'pending';
}

function StatusPill({ status }: { status: ReturnType<typeof getConsentStatus> }) {
  const classes = status === 'granted' 
    ? 'bg-primary/10 border-primary/20 text-primary' 
    : status === 'withdrawn' 
      ? 'bg-error-container/60 border-error/20 text-on-error-container' 
      : 'bg-secondary/15 border-secondary/25 text-secondary';
  return (
    <span className={`rounded-full px-3 py-1 font-display text-[10px] font-bold uppercase tracking-[0.1em] border ${classes}`}>
      {status}
    </span>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}
