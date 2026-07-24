import React from 'react';
import type { DexState } from '../hooks/useDex';
import { TUTOR_NAME } from '../lib/constants';

// ---------------------------------------------------------------------------
// DexAvatar — Visual representation of the Dex tutor character.
//
// Pure SVG/CSS-driven component with no external animation library.
// Takes `state` from useDex() and renders 6 distinct visual states.
//
// This is a placeholder character design — the prop interface is stable
// so restyling later doesn't require touching any calling code.
// ---------------------------------------------------------------------------

interface DexAvatarProps {
  state: DexState;
  caption?: string;
}

const STATE_CONFIG: Record<DexState, {
  bgColor: string;
  faceColor: string;
  ringColor: string;
  label: string;
  animation: string;
}> = {
  idle: {
    bgColor: 'bg-indigo-100',
    faceColor: '#6366f1',
    ringColor: 'ring-indigo-200',
    label: '',
    animation: 'animate-[dex-breathe_3s_ease-in-out_infinite]',
  },
  speaking: {
    bgColor: 'bg-blue-100',
    faceColor: '#3b82f6',
    ringColor: 'ring-blue-300',
    label: 'Speaking…',
    animation: 'animate-[dex-pulse_1s_ease-in-out_infinite]',
  },
  listening: {
    bgColor: 'bg-amber-100',
    faceColor: '#f59e0b',
    ringColor: 'ring-amber-300',
    label: 'Listening…',
    animation: 'animate-[dex-ripple_1.5s_ease-in-out_infinite]',
  },
  thinking: {
    bgColor: 'bg-purple-100',
    faceColor: '#8b5cf6',
    ringColor: 'ring-purple-300',
    label: 'Thinking…',
    animation: 'animate-spin',
  },
  celebrating: {
    bgColor: 'bg-emerald-100',
    faceColor: '#10b981',
    ringColor: 'ring-emerald-300',
    label: '🎉 Correct!',
    animation: 'animate-bounce',
  },
  concerned: {
    bgColor: 'bg-orange-100',
    faceColor: '#f97316',
    ringColor: 'ring-orange-300',
    label: 'Try again!',
    animation: 'animate-[dex-wobble_0.5s_ease-in-out_3]',
  },
};

export default function DexAvatar({ state, caption }: DexAvatarProps) {
  const config = STATE_CONFIG[state];

  return (
    <div className="flex items-start gap-3">
      {/* Avatar circle */}
      <div className={`relative shrink-0`}>
        {/* Outer ring */}
        <div className={`w-14 h-14 rounded-full ${config.bgColor} ring-2 ${config.ringColor} flex items-center justify-center ${config.animation} shadow-sm`}>
          {/* SVG face */}
          <svg viewBox="0 0 48 48" className="w-10 h-10" aria-hidden="true">
            {/* Head */}
            <circle cx="24" cy="24" r="20" fill={config.faceColor} opacity="0.15" />
            <circle cx="24" cy="24" r="16" fill={config.faceColor} opacity="0.25" />

            {/* Eyes */}
            {state === 'celebrating' ? (
              <>
                {/* Happy squinting eyes */}
                <path d="M14 20 Q17 17 20 20" stroke={config.faceColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M28 20 Q31 17 34 20" stroke={config.faceColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
              </>
            ) : state === 'concerned' ? (
              <>
                {/* Slightly worried eyes */}
                <circle cx="17" cy="19" r="2.5" fill={config.faceColor} />
                <circle cx="31" cy="19" r="2.5" fill={config.faceColor} />
                {/* Worried brows */}
                <path d="M14 15 L20 16" stroke={config.faceColor} strokeWidth="1.5" strokeLinecap="round" />
                <path d="M34 15 L28 16" stroke={config.faceColor} strokeWidth="1.5" strokeLinecap="round" />
              </>
            ) : state === 'listening' ? (
              <>
                {/* Wide attentive eyes */}
                <circle cx="17" cy="19" r="3" fill={config.faceColor} />
                <circle cx="31" cy="19" r="3" fill={config.faceColor} />
                <circle cx="17" cy="18" r="1" fill="white" />
                <circle cx="31" cy="18" r="1" fill="white" />
              </>
            ) : (
              <>
                {/* Normal eyes */}
                <circle cx="17" cy="19" r="2.5" fill={config.faceColor} />
                <circle cx="31" cy="19" r="2.5" fill={config.faceColor} />
              </>
            )}

            {/* Mouth */}
            {state === 'speaking' ? (
              /* Speaking — open mouth */
              <ellipse cx="24" cy="30" rx="5" ry="4" fill={config.faceColor} opacity="0.6" />
            ) : state === 'celebrating' ? (
              /* Big smile */
              <path d="M16 28 Q24 36 32 28" stroke={config.faceColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            ) : state === 'concerned' ? (
              /* Slight frown */
              <path d="M18 32 Q24 28 30 32" stroke={config.faceColor} strokeWidth="2" fill="none" strokeLinecap="round" />
            ) : (
              /* Friendly smile */
              <path d="M18 28 Q24 34 30 28" stroke={config.faceColor} strokeWidth="2" fill="none" strokeLinecap="round" />
            )}

            {/* Listening indicator — ear highlight */}
            {state === 'listening' && (
              <>
                <path d="M8 20 Q5 24 8 28" stroke={config.faceColor} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
                <path d="M40 20 Q43 24 40 28" stroke={config.faceColor} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.6" />
              </>
            )}

            {/* Thinking dots */}
            {state === 'thinking' && (
              <>
                <circle cx="17" cy="30" r="1.5" fill={config.faceColor} opacity="0.4" />
                <circle cx="24" cy="30" r="1.5" fill={config.faceColor} opacity="0.6" />
                <circle cx="31" cy="30" r="1.5" fill={config.faceColor} opacity="0.8" />
              </>
            )}
          </svg>
        </div>

        {/* State label badge */}
        {config.label && (
          <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full ${config.bgColor} text-[9px] font-display font-bold uppercase tracking-wider whitespace-nowrap border border-white shadow-sm`}
            style={{ color: config.faceColor }}
          >
            {config.label}
          </span>
        )}
      </div>

      {/* Speech bubble caption */}
      {caption && (
        <div className="relative bg-surface-container-lowest rounded-2xl rounded-tl-sm px-4 py-2.5 border border-surface-container-highest shadow-sm max-w-xs">
          <p className="font-body text-sm text-on-surface leading-relaxed">
            {caption}
          </p>
          <span className="font-display text-[9px] font-bold uppercase tracking-widest text-on-surface-variant mt-1 block">
            {TUTOR_NAME}
          </span>
        </div>
      )}

      {/* CSS keyframe animations injected via style tag */}
      <style>{`
        @keyframes dex-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes dex-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
        }
        @keyframes dex-ripple {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.3); }
          50% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
        }
        @keyframes dex-wobble {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
      `}</style>
    </div>
  );
}
