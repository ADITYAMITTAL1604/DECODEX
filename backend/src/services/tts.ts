import OpenAI from 'openai';
import CircuitBreaker from 'opossum';
import dotenv from 'dotenv';

dotenv.config();

// ---------------------------------------------------------------------------
// Decodex TTS Service — Synthesizes speech from transcript text on-demand.
// Wraps OpenAI TTS API (tts-1, nova voice) in an opossum circuit breaker.
// On failure/breaker-open, returns { useBrowserTts: true } so callers can
// fall back silently to the browser's SpeechSynthesis API — never throws.
// ---------------------------------------------------------------------------

export interface TtsResult {
  audioBuffer: Buffer | null;
  useBrowserTts: boolean;
}

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
};

/**
 * Inner function wrapped by the circuit breaker.
 * Calls OpenAI TTS API and returns the audio as a Buffer.
 */
const _synthesizeSpeech = async (text: string): Promise<TtsResult> => {
  const client = getOpenAIClient();

  if (!client) {
    console.log('[TTS] OPENAI_API_KEY not configured. Signalling browser TTS fallback.');
    return { audioBuffer: null, useBrowserTts: true };
  }

  try {
    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: text,
      response_format: 'mp3',
    });

    const arrayBuffer = await response.arrayBuffer();
    return { audioBuffer: Buffer.from(arrayBuffer), useBrowserTts: false };
  } catch (err: any) {
    console.warn('OpenAI TTS API call failed. Signalling browser TTS fallback:', err.message);
    return { audioBuffer: null, useBrowserTts: true };
  }
};

const breakerOptions = {
  timeout: 15000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};

const ttsBreaker = new CircuitBreaker(_synthesizeSpeech, breakerOptions);

ttsBreaker.fallback(() => {
  console.warn('TTS circuit breaker OPEN or timeout. Signalling browser TTS fallback.');
  return { audioBuffer: null, useBrowserTts: true } as TtsResult;
});

/**
 * Synthesize speech from text using OpenAI TTS.
 *
 * Returns an audio buffer (mp3) or a signal to use browser TTS as fallback.
 * Never throws — all errors result in the browser fallback.
 * Audio is NEVER persisted — generated fresh per request.
 */
export const synthesizeSpeech = async (text: string): Promise<TtsResult> => {
  return await ttsBreaker.fire(text);
};
