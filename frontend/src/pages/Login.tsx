import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import decodexLogo from '../assets/decodex-logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const data = await apiFetch<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      login(data.user);
      const target = data.user.role === 'parent' ? '/parent/home' : data.user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard';
      navigate(target);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="bg-transparent min-h-[calc(100vh-80px)] flex items-center justify-center p-container-padding relative overflow-hidden text-on-surface">
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#006474 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
      <main className="w-full max-w-[440px] glass-card rounded-3xl p-8 sm:p-10 relative z-10 shadow-[0_20px_50px_rgba(0,100,116,0.08)] flex flex-col gap-6">
        <div className="flex flex-col items-center justify-center text-center">
          <img alt="Decodex Logo" className="w-28 h-28 object-contain mb-2 drop-shadow-md" src={decodexLogo} />
          <h1 className="font-display text-2xl font-extrabold text-primary mb-1">Welcome Back to Decodex</h1>
          <p className="font-body text-sm text-secondary font-medium">Understand how every child reads</p>
        </div>

        {error && <div className="p-4 bg-error-container/80 backdrop-blur-md text-on-error-container rounded-2xl text-sm font-body border border-error/20">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-2">
          <div className="flex flex-col gap-2">
            <label className="font-display text-xs font-bold tracking-[0.08em] uppercase text-on-surface-variant block" htmlFor="email">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <span className="material-symbols-outlined text-outline">mail</span>
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 pl-12 pr-4 glass-input rounded-2xl font-body text-lg text-on-surface placeholder-outline-variant focus:outline-none"
                placeholder="teacher@decodex.com"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-display text-xs font-bold tracking-[0.08em] uppercase text-on-surface-variant block" htmlFor="password">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <span className="material-symbols-outlined text-outline">lock</span>
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-14 pl-12 pr-4 glass-input rounded-2xl font-body text-lg text-on-surface placeholder-outline-variant focus:outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className="w-full h-[56px] mt-4 bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-display font-bold text-lg rounded-2xl transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-primary/20 cursor-pointer">
            Log In
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </form>

        <div className="mt-2 text-center space-y-2">
          <p className="font-body text-base text-on-surface-variant">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-bold hover:text-on-primary-fixed-variant underline decoration-2 underline-offset-4 transition-colors">
              Register
            </Link>
          </p>
          <p className="font-body text-xs text-on-surface-variant">
            <Link to="/terms" className="hover:text-primary underline">Terms of Service</Link>
            {' · '}
            <Link to="/privacy" className="hover:text-primary underline">Privacy Policy</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
