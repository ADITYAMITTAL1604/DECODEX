import OpenAI from 'openai';
import CircuitBreaker from 'opossum';
import dotenv from 'dotenv';

dotenv.config();

// ---------------------------------------------------------------------------
// Dex Tutor — Spoken Answer Grading Service
// Uses Groq LLM (same pattern as classifier.ts) to grade a student's spoken
// answer against an expected answer, producing short, encouraging feedback
// suitable for speaking aloud to a child via TTS.
//
// Non-AI fallback: case-insensitive substring match — clearly worse than
// the AI grading but never leaves the student stuck with an error.
// ---------------------------------------------------------------------------

export interface GradingResult {
  correct: boolean;
  feedback: string;
}

const gradingPrompt = `
You are a warm, encouraging reading tutor for children with dyslexia.
A student was asked a question and gave a spoken answer. Decide if the answer is correct.
Respond ONLY with a JSON object: {"correct": true/false, "feedback": "..."}
The feedback MUST be:
- One sentence, under 20 words
- Encouraging even when incorrect (e.g. "Not quite — let's try that one again!")
- Safe to speak aloud to a child via text-to-speech
- Never harsh, sarcastic, or discouraging
Examples of good feedback:
- Correct: "That's exactly right, great job!"
- Incorrect: "Close, but not quite — give it another try!"
`;

/**
 * Non-AI fallback grading — simple case-insensitive substring match.
 * Less accurate than AI grading but ensures the student is never stuck.
 */
function fallbackGrade(expectedAnswer: string, studentTranscript: string): GradingResult {
  const expected = expectedAnswer.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');
  const spoken = studentTranscript.toLowerCase().trim().replace(/[.,!?;:'"]/g, '');

  // Check exact match or if the expected answer appears in the transcript
  const correct = spoken === expected ||
    spoken.includes(expected) ||
    expected.split(/\s+/).every(word => spoken.includes(word));

  return {
    correct,
    feedback: correct
      ? 'Great job, that sounds right!'
      : 'Not quite — let\'s try that one again!',
  };
}

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY || 'dummy_groq_key';
  return {
    client: new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' }),
    model: 'llama-3.3-70b-versatile',
  };
};

const _gradeSpokenAnswer = async ({
  question,
  expectedAnswer,
  studentTranscript,
}: {
  question: string;
  expectedAnswer: string;
  studentTranscript: string;
}): Promise<GradingResult> => {
  const hasGroq = Boolean(process.env.GROQ_API_KEY);

  if (!hasGroq) {
    return fallbackGrade(expectedAnswer, studentTranscript);
  }

  const { client, model } = getGroqClient();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: gradingPrompt },
        {
          role: 'user',
          content: JSON.stringify({ question, expectedAnswer, studentTranscript }),
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{}';

    try {
      const parsed = JSON.parse(content);
      return {
        correct: Boolean(parsed.correct),
        feedback: typeof parsed.feedback === 'string' && parsed.feedback.length > 0
          ? parsed.feedback
          : (parsed.correct ? 'Great job!' : 'Not quite — let\'s try again!'),
      };
    } catch {
      console.error('Failed to parse Groq grading response:', content);
      return fallbackGrade(expectedAnswer, studentTranscript);
    }
  } catch (err: any) {
    console.warn(`Groq grading API call (${model}) failed. Using fallback:`, err.message);
    return fallbackGrade(expectedAnswer, studentTranscript);
  }
};

// Circuit breaker — same pattern as classifier.ts
const breakerOptions = {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
};

const gradingBreaker = new CircuitBreaker(_gradeSpokenAnswer, breakerOptions);

gradingBreaker.fallback(({ expectedAnswer, studentTranscript }: {
  question: string;
  expectedAnswer: string;
  studentTranscript: string;
}) => {
  console.warn('Grading circuit breaker OPEN or timeout. Using substring-match fallback.');
  return fallbackGrade(expectedAnswer, studentTranscript);
});

/**
 * Grade a student's spoken answer against an expected answer.
 * Returns { correct, feedback } — feedback is always short, encouraging,
 * and safe to speak via TTS. Never throws.
 */
export const gradeSpokenAnswer = async (
  question: string,
  expectedAnswer: string,
  studentTranscript: string,
): Promise<GradingResult> => {
  return await gradingBreaker.fire({ question, expectedAnswer, studentTranscript });
};
