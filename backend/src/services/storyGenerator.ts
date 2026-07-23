import { query } from '../db';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// ---------------------------------------------------------------------------
// Dynamic Infinite AI Story Generator (Groq Powered)
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
    goal: 'collect the sweetest berries for an afternoon feast',
    action: 'climbed up gentle grassy hills and reached for the highest branches',
    resolution: 'filled a wicker basket to the brim and shared them with friends',
  },
  {
    goal: 'build a sturdy shelter before the rain fell',
    action: 'gathered fallen pine needles, oak leaves, and straight twigs',
    resolution: 'finished the cozy roof just as the first raindrops tapped softly',
  },
  {
    goal: 'deliver an important handwritten message',
    action: 'trotted swiftly down the winding path under the morning sun',
    resolution: 'handed the letter safely to the old forest owls at sunset',
  },
  {
    goal: 'solve the riddle written on an ancient stone',
    action: 'sounded out each letter carefully and traced the lines with a paw',
    resolution: 'unlocked the secret chamber full of glowing magical crystals',
  },
];

const PHONEME_SENTENCE_SETS: Record<string, string[][]> = {
  sh_ch_th: [
    ['She saw a shiny shell by the shore.', 'Charlie chose a fresh cherry pie.', 'Theo thought three thick branches fell.'],
    ['Shirley brushed her shoes with care.', 'The chipmunk chattered on the branch.', 'Thirty thistles grew near the trail.'],
  ],
  b_d_p: [
    ['Buddy the bear found a big blue ball.', 'Daisy duck dived into deep clear water.', 'Pip the panda picked a sweet peach.'],
    ['A brave boy bounced a ball by the barn.', 'The dog dug deep under the dark oak.', 'Pedro painted a pink paper kite.'],
  ],
  blends: [
    ['The bright green frog leaped over the brook.', 'Brave Brett stopped to clear the path.', 'Grace smiled at the glowing stars.'],
    ['Slick snails slide across smooth stones.', 'Strong breezes blow through pine trees.', 'Fresh spring water flows down.'],
  ],
  general: [
    ['The sun shone warm and bright.', 'Every step brought new excitement.', 'A friendly bird sang a sweet song.'],
    ['Clear water bubbled over smooth rocks.', 'Fresh breeze rustled the high leaves.', 'Happy laughter filled the air.'],
  ],
};

const CATEGORY_TO_FOCUS: Record<string, string> = {
  REV: 'b_d_p',
  BLD: 'blends',
  SUB: 'sh_ch_th',
  OMI: 'general',
  INS: 'general',
  PAC: 'general',
};

/**
 * Generate a personalized reading story for a student using Groq API or Procedural Engine.
 */
export async function generateStoryForStudent(
  studentId: string,
  difficultyLevel: number = 3
): Promise<GeneratedStory> {
  const studentRes = await query(
    `SELECT grade_level FROM users WHERE id = $1`,
    [studentId]
  );
  const gradeLevel = studentRes.rows[0]?.grade_level || difficultyLevel;

  const errorRes = await query(
    `SELECT
       SUM(rev_count) as rev, SUM(sub_count) as sub,
       SUM(omi_count) as omi, SUM(ins_count) as ins,
       SUM(bld_count) as bld, SUM(pac_count) as pac
     FROM error_profiles
     WHERE student_id = $1`,
    [studentId]
  );
  const errors = errorRes.rows[0] || {};
  const errorMap: Array<[string, number]> = [
    ['REV', Number(errors.rev || 0)],
    ['BLD', Number(errors.bld || 0)],
    ['SUB', Number(errors.sub || 0)],
    ['OMI', Number(errors.omi || 0)],
    ['INS', Number(errors.ins || 0)],
    ['PAC', Number(errors.pac || 0)],
  ];
  errorMap.sort((a, b) => b[1] - a[1]);

  const topCategory = errorMap[0][1] > 0 ? errorMap[0][0] : 'general';
  const focusKey = CATEGORY_TO_FOCUS[topCategory] || 'general';

  const countRes = await query(
    `SELECT COUNT(*) as cnt FROM generated_stories WHERE student_id = $1`,
    [studentId]
  );
  const storyNum = parseInt(countRes.rows[0]?.cnt || '0') + 1;

  let title = '';
  let content = '';
  let targetPhonemes: string[] = [];

  const hasGroq = Boolean(process.env.GROQ_API_KEY);

  if (hasGroq) {
    try {
      const client = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
      const model = 'llama-3.3-70b-versatile';

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
      console.warn('Groq story generation fallback to procedural engine:', (llmErr as Error).message);
    }
  }

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
    general: ['general_phonics'],
  }[focusKey] || ['general_phonics'];

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

export const generateStory = generateStoryForStudent;

export async function getStudentStories(studentId: string, limit: number = 20) {
  const res = await query(
    `SELECT * FROM generated_stories
     WHERE student_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [studentId, limit]
  );
  return res.rows.map((r: any) => ({
    id: r.id,
    studentId: r.student_id,
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

export async function getStoryById(storyId: string) {
  const res = await query(
    `SELECT * FROM generated_stories WHERE id = $1`,
    [storyId]
  );
  if (res.rows.length === 0) return null;
  const r = res.rows[0];
  return {
    id: r.id,
    studentId: r.student_id,
    title: r.title,
    content: r.content,
    difficultyLevel: r.difficulty_level,
    targetPhonemes: r.target_phonemes || [],
    targetWeaknesses: r.target_weaknesses || [],
    wordCount: r.word_count,
    timesRead: r.times_read,
    createdAt: r.created_at,
  };
}
