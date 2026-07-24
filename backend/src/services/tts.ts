import OpenAI from 'openai';
import CircuitBreaker from 'opossum';
import dotenv from 'dotenv';

dotenv.config();

// ---------------------------------------------------------------------------
// Text-to-Speech Service
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

const _synthesizeSpeech = async (text: string): Promise<TtsResult> => {
  const client = getOpenAIClient();

  if (!client) {
    console.log('[TTS] OPENAI_API_KEY not configured. Falling back to browser TTS.');
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
    console.warn('OpenAI TTS API call failed. Falling back to browser TTS:', err.message);
    return { audioBuffer: null, useBrowserTts: true };
  }
};

// Circuit breaker — same pattern as openai.ts and classifier.ts
const breakerOptions = {
  timeout: 15000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};

const ttsBreaker = new CircuitBreaker(_synthesizeSpeech, breakerOptions);

ttsBreaker.fallback(() => {
  console.warn('TTS circuit breaker OPEN or timeout. Falling back to browser TTS.');
  return { audioBuffer: null, useBrowserTts: true } as TtsResult;
});

/**
 * Synthesize speech from text using OpenAI TTS.
 * Returns an audio buffer (mp3) or a signal to use browser TTS as fallback.
 * Never throws — all errors result in the browser fallback.
 */
export const synthesizeSpeech = async (text: string): Promise<TtsResult> => {
  return await ttsBreaker.fire(text);
};
