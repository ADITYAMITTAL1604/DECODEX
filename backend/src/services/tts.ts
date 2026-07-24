import OpenAI from 'openai';
import dotenv from 'dotenv';
import CircuitBreaker from 'opossum';

dotenv.config();

// ---------------------------------------------------------------------------
// Decodex TTS Service — Synthesizes speech from transcript text on-demand.
// Mirrors the circuit-breaker pattern in services/openai.ts (whisperBreaker).
//
// IMPORTANT: This generates audio from the stored transcript column — never
// from raw recordings. Generated audio is returned per-request and never
// persisted to disk or database.
// ---------------------------------------------------------------------------

export interface BrowserTtsFallback {
  useBrowserTts: true;
}

export type TtsResult = Buffer | BrowserTtsFallback;

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
    console.log('[TTS MOCK] OPENAI_API_KEY not configured. Signalling browser TTS fallback.');
    return { useBrowserTts: true };
  }

  try {
    const response = await client.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
      response_format: 'mp3',
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: any) {
    console.warn('OpenAI TTS API call failed. Signalling browser TTS fallback:', err.message);
    return { useBrowserTts: true };
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
  return { useBrowserTts: true } as BrowserTtsFallback;
});

/**
 * Synthesize speech from text using OpenAI TTS.
 *
 * Returns a Buffer of MP3 audio on success, or `{ useBrowserTts: true }`
 * when the API key is missing, the call fails, or the circuit breaker is open.
 * Callers should check the return type and send the appropriate HTTP response.
 *
 * Audio is NEVER persisted — generated fresh per request.
 */
export const synthesizeSpeech = async (text: string): Promise<TtsResult> => {
  return await ttsBreaker.fire(text);
};
