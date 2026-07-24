import { useState, useRef, useCallback } from 'react';
import { getApiBaseUrl } from '../lib/api';
import { TUTOR_NAME } from '../lib/constants';

// ---------------------------------------------------------------------------
// useDex — Voice-First Tutor Hook
// Provides speak(), listen(), ask(), and reactive state for the Dex avatar.
// ---------------------------------------------------------------------------

export type DexState = 'idle' | 'speaking' | 'listening' | 'thinking' | 'celebrating' | 'concerned';

export interface DexHook {
  state: DexState;
  caption: string;
  speak: (text: string) => Promise<void>;
  listen: (mode: 'short' | 'long') => Promise<string>;
  ask: (question: string, expectedAnswer: string) => Promise<{ correct: boolean; feedback: string }>;
}

export function useDex(): DexHook {
  const [state, setState] = useState<DexState>('idle');
  const [caption, setCaption] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ------- speak() -------
  // Calls POST /api/v1/tts. If audio returned, plays via HTMLAudioElement.
  // If { useBrowserTts: true }, falls back to window.speechSynthesis silently.
  const speak = useCallback(async (text: string): Promise<void> => {
    setState('speaking');
    setCaption(text);

    // -----------------------------------------------------------------------
    // TTS Strategy:
    // Default: Use free browser SpeechSynthesis (zero cost, zero latency).
    // If VITE_USE_API_TTS=true is set, call the backend TTS endpoint instead
    // (requires OPENAI_API_KEY on the backend — paid).
    // -----------------------------------------------------------------------
    const useApiTts = import.meta.env.VITE_USE_API_TTS === 'true';

    if (useApiTts) {
      try {
        const baseUrl = getApiBaseUrl();
        const targetUrl = baseUrl
          ? `${baseUrl}/api/v1/tts`
          : '/api/v1/tts';

        const response = await fetch(targetUrl, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('audio/mpeg')) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);

          await new Promise<void>((resolve) => {
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = () => {
              URL.revokeObjectURL(url);
              audioRef.current = null;
              resolve();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              audioRef.current = null;
              speakViaBrowser(text).then(resolve);
            };
            audio.play().catch(() => {
              URL.revokeObjectURL(url);
              speakViaBrowser(text).then(resolve);
            });
          });
        } else {
          await speakViaBrowser(text);
        }
      } catch {
        await speakViaBrowser(text);
      }
    } else {
      // Free path — browser TTS directly, no API call
      await speakViaBrowser(text);
    }

    setState('idle');
  }, []);

  // ------- listen('short') -------
  // Uses browser SpeechRecognition (extracted from PracticePage.tsx inline logic).
  const listenShort = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      setState('listening');

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRec) {
        setState('idle');
        resolve('');
        return;
      }

      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
      };

      try {
        const recognition = new SpeechRec();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        // 6-second max safety timeout
        timeoutId = setTimeout(() => {
          try { recognition.abort(); } catch { /* ignore */ }
          cleanup();
          setState('idle');
          resolve('');
        }, 6000);

        recognition.onresult = (event: any) => {
          cleanup();
          const transcript = event.results[0][0].transcript || '';
          setState('idle');
          resolve(transcript);
        };

        recognition.onerror = () => {
          cleanup();
          setState('idle');
          resolve('');
        };

        recognition.onend = () => {
          cleanup();
          setState('idle');
        };

        // Cancel any ongoing TTS to prevent mic lockup
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }

        recognition.start();
      } catch {
        cleanup();
        setState('idle');
        resolve('');
      }
    });
  }, []);

  // ------- listen('long') -------
  // Records audio via MediaRecorder, POSTs to /api/v1/dex/transcribe,
  // returns the Whisper transcript.
  //
  // NOTE: This uses the existing Whisper STT pipeline on the backend, which
  // provides higher accuracy than browser SpeechRecognition at the cost of
  // additional latency. Suitable for comprehension answers but NOT for
  // per-word practice (where responsiveness matters more than accuracy).
  const listenLong = useCallback((): Promise<string> => {
    return new Promise(async (resolve) => {
      setState('listening');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          // Stop all tracks to release mic
          stream.getTracks().forEach(t => t.stop());

          const blob = new Blob(chunks, { type: 'audio/webm' });

          setState('thinking');

          try {
            const baseUrl = getApiBaseUrl();
            const targetUrl = baseUrl
              ? `${baseUrl}/api/v1/dex/transcribe`
              : '/api/v1/dex/transcribe';

            const formData = new FormData();
            formData.append('audio', blob, 'answer.webm');

            const res = await fetch(targetUrl, {
              method: 'POST',
              credentials: 'include',
              body: formData,
            });

            if (res.ok) {
              const data = await res.json();
              setState('idle');
              resolve(data.transcript || '');
            } else {
              setState('idle');
              resolve('');
            }
          } catch {
            setState('idle');
            resolve('');
          }
        };

        mediaRecorder.onerror = () => {
          stream.getTracks().forEach(t => t.stop());
          setState('idle');
          resolve('');
        };

        mediaRecorder.start();

        // Auto-stop after 10 seconds to bound recording length
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, 10000);
      } catch {
        setState('idle');
        resolve('');
      }
    });
  }, []);

  // ------- listen() dispatcher -------
  const listen = useCallback(async (mode: 'short' | 'long'): Promise<string> => {
    return mode === 'short' ? listenShort() : listenLong();
  }, [listenShort, listenLong]);

  // ------- ask() -------
  // Full cycle: speak question → listen for answer → grade → speak feedback.
  // Updates state through the full lifecycle. Can be called again for retry
  // without needing to reconstruct any state.
  const ask = useCallback(async (
    question: string,
    expectedAnswer: string,
  ): Promise<{ correct: boolean; feedback: string }> => {
    // 1. Speak the question
    await speak(question);

    // 2. Listen for the answer (long mode = Whisper for accuracy)
    const transcript = await listen('long');

    // 3. Grade the answer
    setState('thinking');

    let result: { correct: boolean; feedback: string };

    try {
      const baseUrl = getApiBaseUrl();
      const targetUrl = baseUrl
        ? `${baseUrl}/api/v1/dex/grade-answer`
        : '/api/v1/dex/grade-answer';

      const res = await fetch(targetUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, expectedAnswer, studentTranscript: transcript }),
      });

      if (res.ok) {
        result = await res.json();
      } else {
        // Fallback if grading endpoint fails
        result = {
          correct: transcript.toLowerCase().includes(expectedAnswer.toLowerCase()),
          feedback: transcript.toLowerCase().includes(expectedAnswer.toLowerCase())
            ? 'Great job!'
            : 'Let\'s try that one more time!',
        };
      }
    } catch {
      result = {
        correct: transcript.toLowerCase().includes(expectedAnswer.toLowerCase()),
        feedback: transcript.toLowerCase().includes(expectedAnswer.toLowerCase())
          ? 'Great job!'
          : 'Let\'s try that one more time!',
      };
    }

    // 4. Show celebrating or concerned state
    setState(result.correct ? 'celebrating' : 'concerned');

    // 5. Speak the feedback
    await speak(result.feedback);

    // 6. Return to idle
    setState('idle');

    return result;
  }, [speak, listen]);

  return { state, caption, speak, listen, ask };
}

// ---------------------------------------------------------------------------
// Browser TTS fallback — invisible to the user, no error message
// ---------------------------------------------------------------------------
function speakViaBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
