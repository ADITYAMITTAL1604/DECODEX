import OpenAI from 'openai';
import CircuitBreaker from 'opossum';
import dotenv from 'dotenv';
import { AlignmentResult } from './alignment';
import { getCache, setCache, generateHashKey } from './cache';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

// Define the classification taxonomy
export type ErrorCategory = 'REV' | 'SUB' | 'OMI' | 'INS' | 'BLD' | 'PAC' | 'UNC';

export interface ClassificationResult {
  index: number;
  sourceWord: string | null;
  spokenWord: string | null;
  category: ErrorCategory;
  rationale: string;
}

// The system prompt and the JSON parsing logic must agree on the response shape.
// We use response_format: json_object which forces the model to return valid JSON,
// and explicitly ask for a top-level "classifications" key so the parsed shape
// matches what the code expects at `parsed.classifications`.
const classificationPrompt = `
You are an expert reading specialist trained in the Orton-Gillingham approach.
Given a list of reading errors (insertions, omissions, substitutions), classify each error into ONE of the following categories:
- REV: Reversal (e.g., 'was' for 'saw', 'b' for 'd')
- SUB: Substitution (e.g., 'house' for 'horse' due to visual similarity, or completely different word)
- OMI: Omission (skipped a word)
- INS: Insertion (added a word)
- BLD: Blend breakdown (e.g., 'st-op' instead of 'stop')
- PAC: Pacing/Self-correction (stumbling, repeating, then fixing)
- UNC: Uncertain (cannot determine with confidence)

Respond ONLY with a JSON object containing a single key "classifications" whose value is an array of objects.
Each object must have exactly these keys: "index" (integer), "category" (string, one of the codes above), "rationale" (string, ≤30 words).
Example response format:
{"classifications": [{"index": 0, "category": "SUB", "rationale": "Student said 'house' for 'horse', visually similar."}]}
`;

function applyRuleBasedOGClassification(errors: AlignmentResult[]): ClassificationResult[] {
  return errors.map(e => {
    let category: ErrorCategory = 'SUB';
    let rationale = 'Word substitution error.';

    if (e.type === 'omission') {
      category = 'OMI';
      rationale = `Word "${e.sourceWord}" was omitted during reading.`;
    } else if (e.type === 'insertion') {
      category = 'INS';
      rationale = `Inserted word "${e.spokenWord}" not present in source.`;
    } else if (e.sourceWord && e.spokenWord) {
      const src = e.sourceWord.toLowerCase().trim();
      const spk = e.spokenWord.toLowerCase().trim();

      const isLetterReversal = src.length > 1 && src.split('').reverse().join('') === spk;
      const isDirectionalSwap = (
        (src.includes('b') && spk.includes('d')) ||
        (src.includes('d') && spk.includes('b')) ||
        (src.includes('p') && spk.includes('q')) ||
        (src.includes('q') && spk.includes('p')) ||
        (src.includes('m') && spk.includes('w')) ||
        (src.includes('w') && spk.includes('m'))
      ) && src.replace(/[bdpqmw]/g, '') === spk.replace(/[bdpqmw]/g, '');

      if (isLetterReversal || isDirectionalSwap) {
        category = 'REV';
        rationale = `Directional/letter reversal: read "${e.spokenWord}" for "${e.sourceWord}".`;
      } else {
        category = 'SUB';
        rationale = `Substituted "${e.spokenWord}" for "${e.sourceWord}".`;
      }
    }

    return {
      index: e.index,
      sourceWord: e.sourceWord,
      spokenWord: e.spokenWord,
      category,
      rationale,
    };
  });
}

const getLlmClient = () => {
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' }),
      model: 'llama-3.3-70b-versatile',
    };
  }
  return {
    client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy_key_for_testing' }),
    model: 'gpt-4o-mini',
  };
};

const _classifyErrors = async (errors: AlignmentResult[]): Promise<ClassificationResult[]> => {
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-key-here');

  if (!hasGroq && !hasOpenAI) {
    return applyRuleBasedOGClassification(errors);
  }

  const { client, model } = getLlmClient();

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: classificationPrompt },
        { role: 'user', content: JSON.stringify(errors) }
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content || '{"classifications": []}';
    let parsed: { classifications?: any[] };

    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('Failed to parse LLM JSON response:', content);
      parsed = { classifications: [] };
    }

    return errors.map(e => {
      const classification = parsed.classifications?.find((c: any) => c.index === e.index);
      return {
        index: e.index,
        sourceWord: e.sourceWord,
        spokenWord: e.spokenWord,
        category: (classification?.category as ErrorCategory) || 'SUB',
        rationale: classification?.rationale || 'Rule-based classification applied.',
      };
    });
  } catch (err: any) {
    console.warn(`LLM API call (${model}) failed. Using smart Orton-Gillingham rule engine:`, err.message);
    return applyRuleBasedOGClassification(errors);
  }
};

// Circuit Breaker configuration
const breakerOptions = {
  timeout: 10000, // 10 seconds timeout
  errorThresholdPercentage: 50, // Open if 50% of requests fail
  resetTimeout: 30000, // Wait 30s before trying again
};

const classifierBreaker = new CircuitBreaker(_classifyErrors, breakerOptions);

classifierBreaker.fallback((errors: AlignmentResult[]) => {
  console.warn('Classifier circuit breaker OPEN or timeout. Using Orton-Gillingham rule engine fallback.');
  return applyRuleBasedOGClassification(errors);
});

export const classifyErrors = async (alignment: AlignmentResult[]): Promise<ClassificationResult[]> => {
  const errorsOnly = alignment.filter(a => a.type !== 'match');
  if (errorsOnly.length === 0) return [];

  const cacheKey = generateHashKey('classify', errorsOnly);
  const cached = await getCache(cacheKey);

  if (cached) {
    console.log('LLM Cache HIT');
    return JSON.parse(cached);
  }

  console.log('LLM Cache MISS, calling OpenAI...');
  const results = await classifierBreaker.fire(errorsOnly);

  // Only cache successful (non-fallback) results
  const isFallback = results.length > 0 && results[0].rationale === 'Fallback applied due to service timeout/error.';
  if (!isFallback) {
    await setCache(cacheKey, JSON.stringify(results));
  }

  return results;
};
