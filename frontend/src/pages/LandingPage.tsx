import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import decodexLogo from '../assets/decodex-logo.png';

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, offer quick jump to dashboard
  const dashboardPath = user?.role === 'parent' ? '/parent/home' : user?.role === 'teacher' ? '/teacher/dashboard' : '/';

  return (
    <div className="w-full text-on-surface">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-20 flex flex-col items-center text-center">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 flex flex-col items-center">
          <img
            src={decodexLogo}
            alt="Decodex Logo"
            className="w-28 h-28 object-contain mb-4 drop-shadow-md"
          />

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container/20 text-primary border border-primary/20 font-display text-xs font-bold uppercase tracking-widest mb-6">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            AI Diagnostic Reading & Dyslexia Intervention Platform
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-on-surface tracking-tight leading-[1.15] mb-6">
            Understand How Every Child Reads — <span className="text-primary">Powered by AI</span>
          </h1>

          <p className="font-body text-lg sm:text-xl text-on-surface-variant max-w-2xl leading-relaxed mb-8">
            Decodex transcribes speech in real-time, diagnoses reading difficulties using structured Orton-Gillingham taxonomy, and delivers adaptive 20-day multisensory learning plans.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            {isAuthenticated ? (
              <button
                onClick={() => navigate(dashboardPath)}
                className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-primary text-on-primary font-display text-base font-bold uppercase tracking-wider transition-all shadow-lg hover:bg-on-primary-fixed-variant active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                Go to My Dashboard
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="w-full sm:w-auto h-14 px-10 rounded-2xl bg-primary text-on-primary font-display text-base font-bold uppercase tracking-wider transition-all shadow-lg hover:bg-on-primary-fixed-variant active:scale-95 flex items-center justify-center gap-2"
                >
                  Log In
                  <span className="material-symbols-outlined text-xl">login</span>
                </Link>
                <Link
                  to="/register"
                  className="w-full sm:w-auto h-14 px-10 rounded-2xl bg-white text-primary border-2 border-primary/40 hover:border-primary font-display text-base font-bold uppercase tracking-wider transition-all shadow-md hover:bg-primary/5 active:scale-95 flex items-center justify-center gap-2"
                >
                  Register Free
                  <span className="material-symbols-outlined text-xl">person_add</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-12 border-t border-surface-variant/40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-extrabold text-on-surface">Why Decodex Works</h2>
            <p className="font-body text-base text-on-surface-variant mt-2">Built on proven structured literacy and speech-processing technology</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card glass-card-hover rounded-3xl p-8 border border-white/80 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center mb-6 shadow-inner">
                  <span className="material-symbols-outlined text-3xl">mic</span>
                </div>
                <h3 className="font-display text-xl font-bold text-on-surface mb-3">Real-Time Speech STT Engine</h3>
                <p className="font-body text-on-surface-variant text-sm leading-relaxed">
                  Students read aloud into the microphone. Decodex aligns speech to target text, calculating exact Words Per Minute (WPM) and word mispronunciations.
                </p>
              </div>
            </div>

            <div className="glass-card glass-card-hover rounded-3xl p-8 border border-white/80 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-secondary-container/30 text-secondary flex items-center justify-center mb-6 shadow-inner">
                  <span className="material-symbols-outlined text-3xl">psychology</span>
                </div>
                <h3 className="font-display text-xl font-bold text-on-surface mb-3">Orton-Gillingham Taxonomy</h3>
                <p className="font-body text-on-surface-variant text-sm leading-relaxed">
                  Classifies errors into clinical categories (Reversals like b/d, Substitutions, Omissions, Insertions, Blend Breakdowns) powered by Groq LLM intelligence.
                </p>
              </div>
            </div>

            <div className="glass-card glass-card-hover rounded-3xl p-8 border border-white/80 flex flex-col justify-between">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-6 shadow-inner">
                  <span className="material-symbols-outlined text-3xl">calendar_month</span>
                </div>
                <h3 className="font-display text-xl font-bold text-on-surface mb-3">20-Day Interactive Plans</h3>
                <p className="font-body text-on-surface-variant text-sm leading-relaxed">
                  Generates personalized, non-repeating daily activities with Web Speech API audio read-aloud and live voice validation for guaranteed accuracy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section className="py-12 bg-white/40 rounded-3xl border border-white/60 shadow-sm my-8">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl font-extrabold text-on-surface mb-2">How Decodex Operates</h2>
          <p className="font-body text-base text-on-surface-variant mb-10">Three simple steps to personalized reading growth</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-on-primary font-display text-xl font-bold flex items-center justify-center mb-4 shadow-md">
                1
              </div>
              <h4 className="font-display text-lg font-bold text-on-surface mb-2">Take Reading Assessment</h4>
              <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                Student reads Grade-level passages aloud. Live speech alignment records baseline accuracy and speed.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-on-primary font-display text-xl font-bold flex items-center justify-center mb-4 shadow-md">
                2
              </div>
              <h4 className="font-display text-lg font-bold text-on-surface mb-2">Diagnostic Risk Screening</h4>
              <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                Parents & teachers view preliminary dyslexia risk reports, error profiles, and legal action guidelines.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-on-primary font-display text-xl font-bold flex items-center justify-center mb-4 shadow-md">
                3
              </div>
              <h4 className="font-display text-lg font-bold text-on-surface mb-2">Follow 20-Day Path</h4>
              <p className="font-body text-xs text-on-surface-variant leading-relaxed">
                Student completes daily voice activities and fresh AI stories, advancing step-by-step to Stage 2+.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-12 text-center">
        <div className="glass-card rounded-3xl p-8 sm:p-12 border border-white/80 max-w-3xl mx-auto shadow-lg">
          <h2 className="font-display text-3xl font-extrabold text-on-surface mb-3">Ready to Help Every Child Read?</h2>
          <p className="font-body text-base text-on-surface-variant mb-6">
            Get started in seconds with personalized diagnostic reading assessment.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/login"
              className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-primary text-on-primary font-display text-sm font-bold uppercase tracking-wider transition-all shadow-md hover:bg-on-primary-fixed-variant flex items-center justify-center gap-2"
            >
              Log In to Decodex
            </Link>
            <Link
              to="/register"
              className="w-full sm:w-auto h-12 px-8 rounded-2xl bg-white text-primary border border-primary/40 font-display text-sm font-bold uppercase tracking-wider transition-all hover:bg-primary/5 flex items-center justify-center gap-2"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
