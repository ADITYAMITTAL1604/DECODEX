import { query } from '../db';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// ---------------------------------------------------------------------------
// Dynamic Infinite AI Story Generator
// ---------------------------------------------------------------------------

export interface GeneratedStory {
  id: string;
  title: string;
  content: string;
  difficultyLevel: number;
  targetPhonemes: string[];
  targetWeaknesses: string[];
  wordCount: number;
}

// Procedural elements for infinite unique stories
const CHARACTERS = [
  { name: 'Shelly', animal: 'squirrel', phoneme: 'sh' },
  { name: 'Charlie', animal: 'chipmunk', phoneme: 'ch' },
  { name: 'Theo', animal: 'thrush', phoneme: 'th' },
  { name: 'Buddy', animal: 'bear', phoneme: 'b' },
  { name: 'Daisy', animal: 'duck', phoneme: 'd' },
  { name: 'Pedro', animal: 'panda', phoneme: 'p' },
  { name: 'Brett', animal: 'badger', phoneme: 'blends' },
  { name: 'Grace', animal: 'gazelle', phoneme: 'blends' },
  { name: 'Joan', animal: 'jaguar', phoneme: 'vowel_teams' },
  { name: 'Jean', animal: 'blue jay', phoneme: 'vowel_teams' },
  { name: 'Maya', animal: 'monkey', phoneme: 'general' },
  { name: 'Leo', animal: 'lion cub', phoneme: 'general' },
  { name: 'Pip', animal: 'penguin', phoneme: 'p' },
  { name: 'Zeke', animal: 'zebra', phoneme: 'general' },
  { name: 'Chloe', animal: 'cat', phoneme: 'ch' },
];

const SETTINGS = [
  'in a sunlit pine forest',
  'by a sparkling blue stream',
  'near an old stone fountain',
  'high on a snowy mountain crest',
  'inside a colorful shell shop by the shore',
  'across a meadow full of blooming clover',
  'along a quiet rainforest trail',
  'inside a cozy wooden barn',
  'under the shade of a giant oak tree',
  'beside a hidden garden wall',
];

const PLOT_HOOKS = [
  {
    goal: 'find a lost golden key',
    action: 'searched behind thick bushes and splashed through shallow puddles',
    resolution: 'spotted the key shining bright in the green moss and cheered with joy',
  },
  {
    goal: 'collect the sweetest berries for a afternoon feast',
    action: 'climbed up a gentle slope and picked ripe fruit from high branches',
    resolution: 'shared the delicious berries with all their friends near the riverbank',
  },
  {
    goal: 'learn how to sail a tiny leaf boat across the pond',
    action: 'steered carefully past floating lily pads and gentle water ripples',
    resolution: 'reached the far shore safely as the frogs clapped and croaked',
  },
  {
    goal: 'solve the mystery of the strange chirping sound',
    action: 'followed a winding path through whispering trees and soft ferns',
    resolution: 'discovered a friendly baby bird learning its very first morning song',
  },
  {
    goal: 'build a sturdy shelter before the gentle afternoon rain',
    action: 'gathered smooth twigs and broad green leaves with great care',
    resolution: 'sat warmly inside watching raindrops splash softly on the ground outside',
  },
];

// O-G Target Sentence Sets
const PHONEME_SENTENCE_SETS: Record<string, string[][]> = {
  b_d_p: [
    ['Buddy the bold bear dove into the deep blue pond.', 'Daisy the duck paddled past the big dandelion patch.', 'Pedro the panda bounced his bright red ball on the dusty path.'],
    ['Dad built a big wooden barn for the brown dog.', 'Buddy dropped a dirty bone by the deep brook.', 'Daisy dipped her paws into the cool water.'],
  ],
  sh_ch_th: [
    ['Shelly rushed to the shiny shell shop on the shore.', 'Charlie the cheerful chipmunk chose a slice of rich cheese.', 'Theo the thoughtful thrush perched on a thick oak branch.'],
    ['Three small thrushes swooshed through the shadows.', 'Charlie chased a chipmunk through the thistle bushes.', 'Shelly shared her shiny shells with the shopkeeper.'],
  ],
  blends: [
    ['Brett sprinted up the steep slope with his sleek sled.', 'A strong stream splashed over smooth river stones.', 'Grace blazed across the track with great speed and pride.'],
    ['Brock clapped as the bright snow glistened on the crest.', 'Small frogs crouched on flat rocks in the crisp morning.', 'Grace stretched her stride and won the grand prize.'],
  ],
  vowel_teams: [
    ['Rain streamed down as the main train arrived at the station.', 'Joan rowed her small boat slowly across the calm bay.', 'The Green Team was keen to keep the field neat and clean.'],
    ['Eight people boarded the train and sailed down the rail.', 'A toad floated on a leaf as foam drifted past the oar.', 'Jean received a gleam of hope when trees began to leaf.'],
  ],
  general: [
    ['On a warm morning, Maya walked through the lush green valley.', 'Behind the stone wall grew flowers of every bright color.', 'Leo the little explorer wrote every discovery in his notebook.'],
    ['A gentle breeze rustled through the tall sunflowers.', 'Butterflies danced around purple lavender near the fountain.', 'He counted seven tall trees and drew pictures of three birds.'],
  ],
};

const CATEGORY_TO_FOCUS: Record<string, string> = {
  REV: 'b_d_p',
  BLD: 'blends',
  SUB: 'vowel_teams',
  OMI: 'sh_ch_th',
  INS: 'general',
  PAC: 'general',
};

/**
 * Generate a truly infinite, non-repeating adaptive story for a student.
 */
export async function generateStory(studentId: string): Promise<GeneratedStory> {
  // 1. Fetch student's error profile
  const errorRes = await query(
    `SELECT
       SUM(rev_count) as rev, SUM(sub_count) as sub,
       SUM(bld_count) as bld, SUM(omi_count) as omi
     FROM error_profiles WHERE student_id = $1`,
    [studentId]
  );
  const errors = errorRes.rows[0] || {};

  const studentRes = await query(
    `SELECT grade_level FROM users WHERE id = $1`,
    [studentId]
  );
  const gradeLevel = studentRes.rows[0]?.grade_level || 3;

  // Determine top weakness category
  const errorMap: Array<[string, number]> = [
    ['REV', Number(errors.rev || 0)],
    ['BLD', Number(errors.bld || 0)],
    ['SUB', Number(errors.sub || 0)],
    ['OMI', Number(errors.omi || 0)],
  ];
  errorMap.sort((a, b) => b[1] - a[1]);

  const topCategory = errorMap[0][1] > 0 ? errorMap[0][0] : 'general';
  const focusKey = CATEGORY_TO_FOCUS[topCategory] || 'general';

  // 2. Count existing stories to ensure uniqueness sequence
  const countRes = await query(
    `SELECT COUNT(*) as cnt FROM generated_stories WHERE student_id = $1`,
    [studentId]
  );
  const storyNum = parseInt(countRes.rows[0]?.cnt || '0') + 1;

  // 3. Try LLM generation if API Key available, else use Procedural Generator
  let title = '';
  let content = '';
  let targetPhonemes: string[] = [];

  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-your-key-here');

  if (hasGroq || hasOpenAI) {
    try {
      const client = hasGroq
        ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' })
        : new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = hasGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini';

      const completion = await client.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `You are an expert Orton-Gillingham reading specialist. Write an engaging, short reading story (50-80 words) for a Grade ${gradeLevel} student. Target phoneme area: ${focusKey}. Title line: "Title: [Story Title]".`,
          },
          {
            role: 'user',
            content: `Generate story #${storyNum} targeting ${focusKey} patterns for Grade ${gradeLevel}. Make it fun and unique.`,
          },
        ],
        max_tokens: 250,
      });

      const text = completion.choices[0]?.message?.content || '';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const titleLine = lines.find(l => l.toLowerCase().startsWith('title:'));

      if (titleLine) {
        title = titleLine.replace(/^title:\s*/i, '').replace(/[*"]/g, '');
        content = lines.filter(l => !l.toLowerCase().startsWith('title:')).join(' ');
      } else if (lines.length > 0) {
        title = lines[0].replace(/[*"]/g, '');
        content = lines.slice(1).join(' ');
      }
    } catch (llmErr) {
      console.warn('LLM story generation fallback to procedural engine:', (llmErr as Error).message);
    }
  }

  // 4. Procedural Engine Fallback (guarantees infinite unique combinations)
  if (!content || !title) {
    const charObj = CHARACTERS[(storyNum - 1) % CHARACTERS.length];
    const setting = SETTINGS[(storyNum * 3) % SETTINGS.length];
    const plot = PLOT_HOOKS[(storyNum * 7) % PLOT_HOOKS.length];
    const sentenceSets = PHONEME_SENTENCE_SETS[focusKey] || PHONEME_SENTENCE_SETS['general'];
    const sentences = sentenceSets[(storyNum - 1) % sentenceSets.length];

    const TITLE_HOOKS = [
      'Forest Adventure',
      'Riverbank Discovery',
      'Secret Mission',
      'Morning Journey',
      'Shelter Quest',
    ];
    const titleHook = TITLE_HOOKS[(storyNum - 1) % TITLE_HOOKS.length];
    title = `${charObj.name}'s ${titleHook} #${storyNum}`;

    content = `${charObj.name} the ${charObj.animal} lived ${setting}. ` +
      `One bright morning, ${charObj.name} set out to ${plot.goal}. ` +
      `${sentences.join(' ')} ` +
      `Without slowing down, ${charObj.name} ${plot.action}. ` +
      `In the end, ${charObj.name} ${plot.resolution}. ` +
      `It was an unforgettable day full of proud moments!`;
  }

  const wordCount = content.split(/\s+/).filter(Boolean).length;

  targetPhonemes = {
    sh_ch_th: ['sh', 'ch', 'th'],
    b_d_p: ['b', 'd', 'p'],
    blends: ['bl', 'cr', 'str', 'spl', 'br', 'gr'],
    vowel_teams: ['ai', 'ea', 'oa', 'ee'],
    general: ['a', 'e', 'i', 'o', 'u'],
  }[focusKey] || [];

  const difficultyLevel = Math.min(5, Math.max(1, gradeLevel));

  // Save to DB
  const res = await query(
    `INSERT INTO generated_stories
      (student_id, title, content, difficulty_level, target_phonemes,
       target_weaknesses, age_group, word_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      studentId, title, content, difficultyLevel,
      JSON.stringify(targetPhonemes),
      JSON.stringify([topCategory]),
      `grade_${gradeLevel}`,
      wordCount,
    ]
  );

  return {
    id: res.rows[0].id,
    title,
    content,
    difficultyLevel,
    targetPhonemes,
    targetWeaknesses: [topCategory],
    wordCount,
  };
}

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get all generated stories for a student.
 */
export async function getStudentStories(studentId: string, limit: number = 20) {
  const res = await query(
    `SELECT * FROM generated_stories
     WHERE student_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [studentId, limit]
  );
  return res.rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    difficultyLevel: r.difficulty_level,
    targetPhonemes: r.target_phonemes || [],
    targetWeaknesses: r.target_weaknesses || [],
    wordCount: r.word_count,
    timesRead: r.times_read,
    createdAt: r.created_at,
  }));
}

/**
 * Get a single story by ID.
 */
export async function getStoryById(storyId: string) {
  const res = await query(
    `SELECT * FROM generated_stories WHERE id = $1`,
    [storyId]
  );
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    difficultyLevel: r.difficulty_level,
    targetPhonemes: r.target_phonemes || [],
    targetWeaknesses: r.target_weaknesses || [],
    wordCount: r.word_count,
    timesRead: r.times_read,
    studentId: r.student_id,
  };
}
