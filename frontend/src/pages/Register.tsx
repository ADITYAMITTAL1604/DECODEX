import { type FormEvent, type ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';

type AccountType = 'student' | 'parent';
const fieldControlClass = 'h-14 w-full glass-input rounded-2xl px-4 font-body text-lg text-on-surface outline-none transition-all focus:outline-none';

export default function Register() {
  const [accountType, setAccountType] = useState<AccountType>('student');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    display_name: '',
    grade_level: 1,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const endpoint = accountType === 'parent' ? '/auth/register/parent' : '/auth/register';
      const body = accountType === 'parent'
        ? {
          email: formData.email,
          password: formData.password,
          display_name: formData.display_name,
        }
        : formData;

      await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
      navigate('/login');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-transparent px-container-padding py-8 flex items-center justify-center text-on-surface">
      <main className="mx-auto w-full max-w-[480px] glass-card rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,100,116,0.08)]">
        <div className="mb-8 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-secondary">Decodex Account</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold text-primary">Create Your Account</h1>
          <p className="mt-2 font-body text-base text-on-surface-variant">Choose the account that fits how you use Decodex.</p>
        </div>

        <div className="mb-7 grid grid-cols-2 rounded-2xl bg-surface-container/60 p-1.5 backdrop-blur-md" role="tablist" aria-label="Account type">
          {(['student', 'parent'] as AccountType[]).map((type) => (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={accountType === type}
              onClick={() => setAccountType(type)}
              className={`rounded-xl px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.08em] transition-all duration-200 ${
                accountType === type
                  ? 'bg-white text-primary shadow-md font-bold'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {error ? <div role="alert" className="mb-5 rounded-2xl bg-error-container/80 backdrop-blur-md p-4 font-body text-sm text-on-error-container border border-error/20">{error}</div> : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label={accountType === 'parent' ? 'Your Name' : 'Student Name'} id="display-name">
            <input
              id="display-name"
              value={formData.display_name}
              onChange={(event) => setFormData({ ...formData, display_name: event.target.value })}
              className={fieldControlClass}
              autoComplete="name"
              placeholder="e.g. Alex Smith"
              required
            />
          </Field>
          <Field label="Email Address" id="email">
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(event) => setFormData({ ...formData, email: event.target.value })}
              className={fieldControlClass}
              autoComplete="email"
              placeholder="alex@example.com"
              required
            />
          </Field>
          <Field label="Password" id="password" hint="Minimum 8 characters">
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(event) => setFormData({ ...formData, password: event.target.value })}
              className={fieldControlClass}
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={8}
              required
            />
          </Field>
          {accountType === 'student' ? (
            <Field label="Grade Level" id="grade-level">
              <select
                id="grade-level"
                value={formData.grade_level}
                onChange={(event) => setFormData({ ...formData, grade_level: Number(event.target.value) })}
                className={fieldControlClass}
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
              </select>
            </Field>
          ) : null}
          <button disabled={submitting} className="mt-2 h-14 rounded-2xl bg-primary font-display text-lg font-bold text-on-primary transition-all duration-200 hover:bg-on-primary-fixed-variant disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] shadow-lg shadow-primary/20">
            {submitting ? 'Creating account…' : `Create ${accountType} Account`}
          </button>
        </form>

        <p className="mt-7 text-center font-body text-base text-on-surface-variant">
          Already have an account? <Link to="/login" className="font-bold text-primary underline decoration-2 underline-offset-4">Log in</Link>
        </p>
      </main>
    </div>
  );
}

function Field({ children, hint, id, label }: { children: ReactNode; hint?: string; id: string; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-display text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">{label}</label>
      {children}
      {hint ? <p className="font-body text-xs text-on-surface-variant">{hint}</p> : null}
    </div>
  );
}
