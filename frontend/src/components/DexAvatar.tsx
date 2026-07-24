import React from 'react';
import type { DexState } from '../hooks/useDex';
import { TUTOR_NAME } from '../lib/constants';
import dexCharacterImg from '../assets/dex-character.png';

// ---------------------------------------------------------------------------
// DexAvatar — Animated Cartoon Mascot Companion for Dex
//
// Dynamic character animations:
// 1. Victory Dance triggers automatically ONLY on correct reading / answer (state === 'celebrating').
// 2. Facial expressions & emotions shown directly through character light layers,
//    eye sparkles, lip-sync glows, ear focus rings, and head motions (NO EMOJIS).
// ---------------------------------------------------------------------------

export interface DexAvatarProps {
  state: DexState;
  caption?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showCaptionBubble?: boolean;
}

const STATE_CONFIG: Record<DexState, {
  ringColor: string;
  glowColor: string;
  labelBg: string;
  labelText: string;
  labelIcon: string;
  label: string;
  animationClass: string;
}> = {
  idle: {
    ringColor: 'ring-indigo-300',
    glowColor: 'shadow-indigo-500/30',
    labelBg: 'bg-indigo-600',
    labelText: 'text-white',
    labelIcon: 'auto_awesome',
    label: 'Ready to Read',
    animationClass: 'animate-[dex-float_3.5s_ease-in-out_infinite]',
  },
  speaking: {
    ringColor: 'ring-sky-400',
    glowColor: 'shadow-sky-500/50',
    labelBg: 'bg-sky-600',
    labelText: 'text-white',
    labelIcon: 'volume_up',
    label: 'Dex Reading…',
    animationClass: 'animate-[dex-speak-bounce_0.8s_ease-in-out_infinite]',
  },
  listening: {
    ringColor: 'ring-amber-400',
    glowColor: 'shadow-amber-500/50',
    labelBg: 'bg-amber-600',
    labelText: 'text-white',
    labelIcon: 'mic',
    label: 'Listening to You…',
    animationClass: 'animate-[dex-listen-lean_1.5s_ease-in-out_infinite]',
  },
  thinking: {
    ringColor: 'ring-purple-400',
    glowColor: 'shadow-purple-500/50',
    labelBg: 'bg-purple-600',
    labelText: 'text-white',
    labelIcon: 'psychology',
    label: 'Evaluating…',
    animationClass: 'animate-[dex-think-tilt_2s_ease-in-out_infinite]',
  },
  celebrating: {
    ringColor: 'ring-emerald-400',
    glowColor: 'shadow-emerald-500/70',
    labelBg: 'bg-emerald-600',
    labelText: 'text-white',
    labelIcon: 'verified',
    label: 'Line Mastered!',
    // VICTORY DANCE: Triggers ONLY on correct answer/effortless line reading
    animationClass: 'animate-[dex-victory-dance_0.5s_ease-in-out_infinite]',
  },
  concerned: {
    ringColor: 'ring-rose-400',
    glowColor: 'shadow-rose-500/40',
    labelBg: 'bg-rose-600',
    labelText: 'text-white',
    labelIcon: 'favorite',
    label: 'Let\'s Practice Again',
    animationClass: 'animate-[dex-gentle-nudge_1.5s_ease-in-out_infinite]',
  },
};

export default function DexAvatar({
  state,
  caption,
  size = 'md',
  showCaptionBubble = true,
}: DexAvatarProps) {
  const config = STATE_CONFIG[state] || STATE_CONFIG.idle;

  // Size scaling map
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-28 h-28 sm:w-32 sm:h-32',
    lg: 'w-40 h-40 sm:w-48 sm:h-48',
    hero: 'w-56 h-56 sm:w-64 sm:h-64',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center relative select-none group">
      {/* Cartoon Character Container */}
      <div className={`relative flex items-center justify-center ${config.animationClass}`}>
        
        {/* Magical Backdrop Aura */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-amber-300/30 via-pink-400/30 to-purple-500/30 blur-xl transition-opacity duration-500 ${
            state === 'celebrating' || state === 'speaking' ? 'opacity-100 scale-125' : 'opacity-60'
          }`}
        />

        {/* Victory Celebration Rainbow Ring — Active ONLY on correct reading */}
        {state === 'celebrating' && (
          <div className="absolute -inset-4 rounded-full border-4 border-dashed border-amber-400/80 animate-[dex-spin-ring_4s_linear_infinite] pointer-events-none" />
        )}

        {/* Dex Mascot Character Card */}
        <div
          className={`relative ${sizeClasses} rounded-3xl overflow-hidden p-1 bg-gradient-to-b from-white/95 to-amber-50/90 ring-4 ${config.ringColor} shadow-xl ${config.glowColor} backdrop-blur-md flex items-center justify-center`}
        >
          {/* Official Mascot Image */}
          <img
            src={dexCharacterImg}
            alt={TUTOR_NAME}
            className={`w-full h-full object-contain filter drop-shadow-lg transition-transform duration-300 ${
              state === 'celebrating' ? 'scale-110' : ''
            }`}
          />

          {/* FACIAL EXPRESSIONS & EMOTIONAL LIGHT OVERLAYS (NO EMOJIS) */}
          {state === 'celebrating' && (
            /* Joyful facial glow + sparkling eye highlights */
            <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none animate-pulse">
              <div className="absolute top-1/4 left-1/3 w-3 h-3 bg-amber-200 rounded-full blur-xs animate-ping" />
              <div className="absolute top-1/4 right-1/3 w-3 h-3 bg-amber-200 rounded-full blur-xs animate-ping" />
            </div>
          )}

          {state === 'listening' && (
            /* Golden ear focus rings + audio wave highlight */
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-amber-400/35 to-transparent pointer-events-none flex items-center justify-center">
              <div className="w-full h-1 bg-amber-400/70 rounded-full animate-[dex-soundwave_0.6s_ease-in-out_infinite]" />
            </div>
          )}

          {state === 'speaking' && (
            /* Lip-sync light pulsation at mouth level */
            <div className="absolute bottom-1/3 left-1/2 -translate-x-1/2 w-6 h-3 bg-sky-400/40 rounded-full blur-xs animate-[dex-lip-sync_0.3s_ease-in-out_infinite]" />
          )}

          {state === 'thinking' && (
            /* Thoughtful eye highlight shift */
            <div className="absolute top-1/3 right-1/3 w-4 h-4 bg-purple-400/30 rounded-full blur-xs animate-pulse" />
          )}

          {state === 'concerned' && (
            /* Soft gentle encouraging blush */
            <div className="absolute inset-0 bg-rose-500/10 pointer-events-none flex items-center justify-center">
              <div className="w-16 h-8 bg-rose-400/20 rounded-full blur-md" />
            </div>
          )}
        </div>

        {/* State Status Badge */}
        <div
          className={`absolute -bottom-3 px-3 py-1 rounded-full ${config.labelBg} ${config.labelText} font-display text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-1 z-20 border-2 border-white`}
        >
          <span className="material-symbols-outlined text-sm sm:text-base">{config.labelIcon}</span>
          <span>{config.label}</span>
        </div>
      </div>

      {/* Speech Bubble Caption */}
      {showCaptionBubble && caption && (
        <div className="mt-5 relative max-w-sm sm:max-w-md w-full bg-white/95 backdrop-blur-md rounded-2xl p-4 border-2 border-secondary/30 shadow-lg text-center animate-in fade-in slide-in-from-bottom-2">
          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-b-8 border-b-white/95" />
          <p className="font-body text-sm sm:text-base text-on-surface font-semibold leading-relaxed">
            "{caption}"
          </p>
          <div className="mt-1 flex items-center justify-center gap-1 font-display text-[10px] font-extrabold uppercase tracking-widest text-secondary">
            <span className="material-symbols-outlined text-xs">auto_awesome</span>
            {TUTOR_NAME} — Dyslexia Reading Companion
          </div>
        </div>
      )}

      {/* CSS Keyframes for Pure Character Animations */}
      <style>{`
        @keyframes dex-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-7px) rotate(1deg); }
        }
        @keyframes dex-speak-bounce {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.05) translateY(-4px); }
        }
        @keyframes dex-listen-lean {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(-2deg); }
        }
        @keyframes dex-think-tilt {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-5deg) translateY(-2px); }
        }
        @keyframes dex-victory-dance {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
          25% { transform: translateY(-14px) scale(1.1) rotate(-5deg); }
          75% { transform: translateY(-5px) scale(1.05) rotate(5deg); }
        }
        @keyframes dex-gentle-nudge {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes dex-spin-ring {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes dex-soundwave {
          0%, 100% { transform: scaleX(0.4); opacity: 0.4; }
          50% { transform: scaleX(1); opacity: 1; }
        }
        @keyframes dex-lip-sync {
          0%, 100% { transform: scale(0.8); opacity: 0.3; }
          50% { transform: scale(1.3); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
