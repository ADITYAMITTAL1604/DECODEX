import React, { useState } from 'react';
import type { DexState } from '../hooks/useDex';
import { TUTOR_NAME } from '../lib/constants';
import dexCharacterImg from '../assets/dex-character.png';

// ---------------------------------------------------------------------------
// DexAvatar — Interactive Cartoon Companion for Dex
// Renders the official Dex elf mascot with dynamic game-like cartoon animations,
// facial expression overlays, floating spell particles, and emotional state badges.
// ---------------------------------------------------------------------------

export interface DexAvatarProps {
  state: DexState;
  caption?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showCaptionBubble?: boolean;
}

const STATE_THEMES: Record<DexState, {
  ringColor: string;
  glowColor: string;
  badgeBg: string;
  badgeText: string;
  badgeIcon: string;
  badgeLabel: string;
  animationClass: string;
  particleEmojis: string[];
}> = {
  idle: {
    ringColor: 'ring-indigo-300',
    glowColor: 'shadow-indigo-500/30',
    badgeBg: 'bg-indigo-500',
    badgeText: 'text-white',
    badgeIcon: 'auto_awesome',
    badgeLabel: 'Ready to Read',
    animationClass: 'animate-[dex-float-breathe_4s_ease-in-out_infinite]',
    particleEmojis: ['✨', 'A', 'B', 'C', '⭐'],
  },
  speaking: {
    ringColor: 'ring-sky-400',
    glowColor: 'shadow-sky-500/50',
    badgeBg: 'bg-sky-500',
    badgeText: 'text-white',
    badgeIcon: 'volume_up',
    badgeLabel: 'Dex Reading…',
    animationClass: 'animate-[dex-pulse-speak_1.2s_ease-in-out_infinite]',
    particleEmojis: ['🎵', '📖', 'ABC', '✨', '🎶'],
  },
  listening: {
    ringColor: 'ring-amber-400',
    glowColor: 'shadow-amber-500/50',
    badgeBg: 'bg-amber-500',
    badgeText: 'text-white',
    badgeIcon: 'mic',
    badgeLabel: 'Listening to You…',
    animationClass: 'animate-[dex-listen-wave_1.5s_ease-in-out_infinite]',
    particleEmojis: ['👂', '🎙️', '✨', '🎧', '🗣️'],
  },
  thinking: {
    ringColor: 'ring-purple-400',
    glowColor: 'shadow-purple-500/50',
    badgeBg: 'bg-purple-500',
    badgeText: 'text-white',
    badgeIcon: 'psychology',
    badgeLabel: 'Evaluating…',
    animationClass: 'animate-[dex-tilt-think_2s_ease-in-out_infinite]',
    particleEmojis: ['💡', '❓', '🔍', '✨', '✏️'],
  },
  celebrating: {
    ringColor: 'ring-emerald-400',
    glowColor: 'shadow-emerald-500/60',
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-white',
    badgeIcon: 'celebration',
    badgeLabel: '🎉 Victory Dance!',
    animationClass: 'animate-[dex-happy-dance_0.6s_ease-in-out_infinite]',
    particleEmojis: ['🎉', '🌟', '🏆', '🌈', '💖', '✨'],
  },
  concerned: {
    ringColor: 'ring-rose-400',
    glowColor: 'shadow-rose-500/40',
    badgeBg: 'bg-rose-500',
    badgeText: 'text-white',
    badgeIcon: 'favorite',
    badgeLabel: 'You Can Do It!',
    animationClass: 'animate-[dex-encourage-nudge_1.5s_ease-in-out_infinite]',
    particleEmojis: ['💖', '💪', '🌱', '⭐', '🤗'],
  },
};

export default function DexAvatar({
  state,
  caption,
  size = 'md',
  showCaptionBubble = true,
}: DexAvatarProps) {
  const [clicked, setClicked] = useState(false);
  const theme = STATE_THEMES[state] || STATE_THEMES.idle;

  // Handle interactive click reaction
  const handleClick = () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 800);
  };

  // Size scaling maps
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-28 h-28 sm:w-32 sm:h-32',
    lg: 'w-40 h-40 sm:w-48 sm:h-48',
    hero: 'w-56 h-56 sm:w-64 sm:h-64',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center relative select-none group">
      {/* Outer container holding mascot & particles */}
      <div
        onClick={handleClick}
        className={`relative flex items-center justify-center cursor-pointer transition-transform duration-300 active:scale-95 ${
          clicked ? 'animate-[dex-magic-spin_0.8s_ease-in-out]' : theme.animationClass
        }`}
      >
        {/* Magical Glowing Backdrop Ring */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr from-amber-300/30 via-pink-400/30 to-purple-500/30 blur-xl transition-opacity duration-500 ${
            state === 'celebrating' || state === 'speaking' ? 'opacity-100 scale-110' : 'opacity-70'
          }`}
        />

        {/* Floating Alphabet & Magic Sparkle Particles */}
        <div className="absolute inset-0 pointer-events-none z-10 overflow-visible">
          {theme.particleEmojis.map((emoji, i) => (
            <span
              key={i}
              className="absolute font-display font-extrabold text-sm sm:text-base animate-[dex-particle-float_3s_ease-in-out_infinite] drop-shadow-md"
              style={{
                top: `${10 + (i * 18) % 70}%`,
                left: i % 2 === 0 ? `-${15 + (i * 5)}%` : `${95 + (i * 5)}%`,
                animationDelay: `${i * 0.4}s`,
              }}
            >
              {emoji}
            </span>
          ))}
        </div>

        {/* Dex Mascot Character Card Image Container */}
        <div
          className={`relative ${sizeClasses} rounded-3xl overflow-hidden p-1 bg-gradient-to-b from-white/90 to-amber-50/80 ring-4 ${theme.ringColor} shadow-xl ${theme.glowColor} backdrop-blur-md flex items-center justify-center`}
        >
          <img
            src={dexCharacterImg}
            alt={TUTOR_NAME}
            className="w-full h-full object-contain filter drop-shadow-lg transform transition-transform duration-300 group-hover:scale-105"
          />

          {/* Emotional Mood Overlay Filters */}
          {state === 'celebrating' && (
            <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none animate-pulse flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-amber-300 drop-shadow-lg animate-ping">star</span>
            </div>
          )}

          {state === 'listening' && (
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-amber-500/30 to-transparent pointer-events-none flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-white animate-bounce">equalizer</span>
            </div>
          )}

          {state === 'concerned' && (
            <div className="absolute inset-0 bg-rose-500/10 pointer-events-none flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-rose-500 animate-pulse">favorite</span>
            </div>
          )}
        </div>

        {/* State Status Badge */}
        <div
          className={`absolute -bottom-3 px-3 py-1 rounded-full ${theme.badgeBg} ${theme.badgeText} font-display text-[10px] sm:text-xs font-bold uppercase tracking-wider shadow-md flex items-center gap-1 z-20 border-2 border-white`}
        >
          <span className="material-symbols-outlined text-sm sm:text-base">{theme.badgeIcon}</span>
          <span>{theme.badgeLabel}</span>
        </div>
      </div>

      {/* Speech Bubble Caption */}
      {showCaptionBubble && caption && (
        <div className="mt-5 relative max-w-sm sm:max-w-md w-full bg-white/95 backdrop-blur-md rounded-2xl p-4 border-2 border-secondary/30 shadow-lg text-center animate-in fade-in slide-in-from-bottom-2">
          {/* Speech bubble pointer triangle */}
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

      {/* CSS Keyframe Animations for Cartoon Dynamics */}
      <style>{`
        @keyframes dex-float-breathe {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes dex-pulse-speak {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.06) translateY(-4px); }
        }
        @keyframes dex-listen-wave {
          0%, 100% { transform: translateY(0) scale(1); }
          25% { transform: translateY(-3px) rotate(-2deg); }
          75% { transform: translateY(-3px) rotate(2deg); }
        }
        @keyframes dex-tilt-think {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(-5deg) scale(1.03); }
        }
        @keyframes dex-happy-dance {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
          25% { transform: translateY(-12px) scale(1.08) rotate(-4deg); }
          75% { transform: translateY(-4px) scale(1.04) rotate(4deg); }
        }
        @keyframes dex-encourage-nudge {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.03); }
        }
        @keyframes dex-magic-spin {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.2) rotate(180deg); }
          100% { transform: scale(1) rotate(360deg); }
        }
        @keyframes dex-particle-float {
          0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
          50% { transform: translateY(-10px) scale(1.2); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
