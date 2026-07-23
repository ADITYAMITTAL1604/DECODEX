import { query } from '../db';
import { awardXP } from './gamification';

// ---------------------------------------------------------------------------
// Learning Path Generator — Personalized, Day-by-Day Interactive Plans
// Gated on student completing at least 2 diagnostic reading test sessions.
// ---------------------------------------------------------------------------

export const REQUIRED_SESSIONS_FOR_PLAN = 2;

export interface DayTask {
  dayNumber: number;
  title: string;
  activityType: 'drill' | 'story' | 'reading' | 'phonics';
  description: string;
  targetSkill: string;
  targetUrl: string;
  actionLabel: string;
  estimatedMinutes: number;
  completed: boolean;
  completedAt?: string | null;
}

export interface LearningWeek {
  id: string;
  weekNumber: number;
  focusArea: string;
  description: string;
  days: DayTask[];
  completed: boolean;
  completedAt: string | null;
}

export interface LearningPathResult {
  id: string;
  title: string;
  totalWeeks: number;
  currentWeek: number;
  status: string;
  planSummary: string;
  canGenerate: boolean;
  completedSessionsCount: number;
  requiredSessionsCount: number;
  weeks: LearningWeek[];
}

// Category mappings to skills and URLs
const CATEGORY_SKILL_MAP: Record<string, { title: string; skill: string; focus: string }> = {
  REV: { title: 'Visual Discrimination (b/d, p/q)', skill: 'REV', focus: 'Letter Reversals' },
  BLD: { title: 'Phoneme Blending & Clusters', skill: 'BLD', focus: 'Blend Breakdowns' },
  SUB: { title: 'Sight Word & Pattern Mastery', skill: 'SUB', focus: 'Word Substitutions' },
  OMI: { title: 'Tracking & Precise Word Reading', skill: 'OMI', focus: 'Word Omissions' },
  INS: { title: 'Exact Match & Insertion Prevention', skill: 'INS', focus: 'Word Insertions' },
  PAC: { title: 'Fluency, Pacing & Self-Correction', skill: 'PAC', focus: 'Pacing Issues' },
};

/**
 * Check how many completed sessions a student has.
 */
export async function getCompletedSessionsCount(studentId: string): Promise<number> {
  const res = await query(
    `SELECT COUNT(*) as cnt FROM reading_sessions
     WHERE student_id = $1 AND status = 'completed' AND deleted_at IS NULL`,
    [studentId]
  );
  return parseInt(res.rows[0]?.cnt || '0', 10);
}

/**
 * Generate a personalized 4-week, 20-day interactive learning path.
 * Requires at least 2 completed reading sessions.
 */
export async function generateLearningPath(studentId: string): Promise<LearningPathResult> {
  const sessionCount = await getCompletedSessionsCount(studentId);

  if (sessionCount < REQUIRED_SESSIONS_FOR_PLAN) {
    const error: any = new Error(
      `At least ${REQUIRED_SESSIONS_FOR_PLAN} completed reading assessment sessions are required before generating a personalized learning path. (Current: ${sessionCount}/${REQUIRED_SESSIONS_FOR_PLAN})`
    );
    error.code = 'INSUFFICIENT_SESSIONS';
    error.details = { current: sessionCount, required: REQUIRED_SESSIONS_FOR_PLAN };
    throw error;
  }

  // Aggregate student's actual error counts across all sessions
  const errorRes = await query(
    `SELECT
       SUM(rev_count) as rev, SUM(sub_count) as sub,
       SUM(omi_count) as omi, SUM(ins_count) as ins,
       SUM(bld_count) as bld, SUM(pac_count) as pac,
       AVG(words_per_minute) as avg_wpm
     FROM error_profiles ep
     JOIN reading_sessions rs ON rs.id = ep.session_id
     WHERE ep.student_id = $1 AND rs.status = 'completed' AND rs.deleted_at IS NULL`,
    [studentId]
  );
  const errors = errorRes.rows[0] || {};
  const avgWpm = Math.round(parseFloat(errors.avg_wpm || '0'));

  // Sort weaknesses by actual frequency
  const errorCounts: Array<[string, number]> = [
    ['REV', Number(errors.rev || 0)],
    ['BLD', Number(errors.bld || 0)],
    ['SUB', Number(errors.sub || 0)],
    ['OMI', Number(errors.omi || 0)],
    ['INS', Number(errors.ins || 0)],
    ['PAC', Number(errors.pac || 0)],
  ];
  errorCounts.sort((a, b) => b[1] - a[1]);

  const primaryCategory = errorCounts[0][1] > 0 ? errorCounts[0][0] : 'SUB';
  const secondaryCategory = errorCounts[1][1] > 0 ? errorCounts[1][0] : 'BLD';

  const studentRes = await query(`SELECT display_name, grade_level FROM users WHERE id = $1`, [studentId]);
  const studentName = studentRes.rows[0]?.display_name || 'Student';
  const gradeLevel = studentRes.rows[0]?.grade_level || 3;

  const primaryMeta = CATEGORY_SKILL_MAP[primaryCategory] || CATEGORY_SKILL_MAP['SUB'];
  const secondaryMeta = CATEGORY_SKILL_MAP[secondaryCategory] || CATEGORY_SKILL_MAP['BLD'];

  const planSummary = `Personalized 4-Week Day-by-Day Reading Plan for ${studentName} (Grade ${gradeLevel}, ${sessionCount} diagnostic sessions analyzed). ` +
    `Focusing on ${primaryMeta.focus} (${errorCounts[0][1]} errors) and ${secondaryMeta.focus} (${errorCounts[1][1]} errors) with average speed ${avgWpm} WPM.`;

  // Deactivate any old active paths
  await query(`UPDATE learning_paths SET status = 'paused', updated_at = NOW() WHERE student_id = $1 AND status = 'active'`, [studentId]);

  // Insert main path record
  const pathRes = await query(
    `INSERT INTO learning_paths (student_id, title, total_weeks, plan_summary)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [studentId, `${studentName}'s Diagnostic Reading Plan`, 4, planSummary]
  );
  const pathId = pathRes.rows[0].id;

  const weeks: LearningWeek[] = [];

  // Week 1: Primary weakness deep-dive
  weeks.push(buildWeekData(pathId, 1, `Week 1: ${primaryMeta.title}`, `Focus on reducing ${primaryMeta.focus} errors using Orton-Gillingham techniques.`, primaryCategory, gradeLevel));

  // Week 2: Secondary weakness reinforcement
  weeks.push(buildWeekData(pathId, 2, `Week 2: ${secondaryMeta.title}`, `Address ${secondaryMeta.focus} patterns and strengthen core phonics.`, secondaryCategory, gradeLevel));

  // Week 3: Fluency & speed building
  weeks.push(buildWeekData(pathId, 3, 'Week 3: Fluency & Pacing Building', `Build reading speed toward Grade ${gradeLevel} benchmarks with repeated exposure.`, 'PAC', gradeLevel));

  // Week 4: Integration & Assessment
  weeks.push(buildWeekData(pathId, 4, 'Week 4: Mastery & Diagnostic Assessment', 'Apply all learned strategies to new passages and complete progress re-assessment.', primaryCategory, gradeLevel));

  // Save weeks to DB
  for (const week of weeks) {
    const weekRes = await query(
      `INSERT INTO learning_path_weeks (path_id, week_number, focus_area, description, exercises)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [pathId, week.weekNumber, week.focusArea, week.description, JSON.stringify(week.days)]
    );
    week.id = weekRes.rows[0].id;
  }

  return {
    id: pathId,
    title: `${studentName}'s Diagnostic Reading Plan`,
    totalWeeks: 4,
    currentWeek: 1,
    status: 'active',
    planSummary,
    canGenerate: true,
    completedSessionsCount: sessionCount,
    requiredSessionsCount: REQUIRED_SESSIONS_FOR_PLAN,
    weeks,
  };
}

function buildWeekData(pathId: string, weekNum: number, title: string, description: string, category: string, grade: number): LearningWeek {
  const meta = CATEGORY_SKILL_MAP[category] || CATEGORY_SKILL_MAP['SUB'];

  const days: DayTask[] = [
    {
      dayNumber: 1,
      title: `Day 1: ${meta.focus} Warm-up`,
      activityType: 'drill',
      description: `Practice ${meta.focus} drills targeting letter-sound relationships.`,
      targetSkill: meta.skill,
      targetUrl: '/passages',
      actionLabel: 'Start Practice Drill',
      estimatedMinutes: 10,
      completed: false,
    },
    {
      dayNumber: 2,
      title: `Day 2: AI Adaptive Story Reading`,
      activityType: 'story',
      description: `Read a custom AI story generated specifically for ${meta.focus} practice.`,
      targetSkill: meta.skill,
      targetUrl: '/stories',
      actionLabel: 'Read AI Story',
      estimatedMinutes: 12,
      completed: false,
    },
    {
      dayNumber: 3,
      title: `Day 3: Targeted Passage Reading`,
      activityType: 'reading',
      description: `Read a Grade ${grade} passage with finger-tracking focus.`,
      targetSkill: meta.skill,
      targetUrl: '/passages',
      actionLabel: 'Take Passage Test',
      estimatedMinutes: 15,
      completed: false,
    },
    {
      dayNumber: 4,
      title: `Day 4: AI Story Reading #2`,
      activityType: 'story',
      description: `Practice a second adaptive story targeting phoneme confidence.`,
      targetSkill: meta.skill,
      targetUrl: '/stories',
      actionLabel: 'Read AI Story',
      estimatedMinutes: 10,
      completed: false,
    },
    {
      dayNumber: 5,
      title: `Day 5: Weekly Mastery Assessment`,
      activityType: 'reading',
      description: `Complete a reading session to evaluate accuracy and speed improvement.`,
      targetSkill: 'MASTERY',
      targetUrl: '/passages',
      actionLabel: 'Complete Assessment',
      estimatedMinutes: 15,
      completed: false,
    },
  ];

  return {
    id: '',
    weekNumber: weekNum,
    focusArea: title,
    description,
    days,
    completed: false,
    completedAt: null,
  };
}

/**
 * Get active learning path for student.
 */
export async function getActiveLearningPath(studentId: string): Promise<LearningPathResult | null> {
  const sessionCount = await getCompletedSessionsCount(studentId);

  const pathRes = await query(
    `SELECT * FROM learning_paths
     WHERE student_id = $1 AND status = 'active'
     ORDER BY created_at DESC LIMIT 1`,
    [studentId]
  );
  if (pathRes.rows.length === 0) {
    return {
      id: '',
      title: 'Personalized Reading Plan',
      totalWeeks: 4,
      currentWeek: 1,
      status: 'none',
      planSummary: '',
      canGenerate: sessionCount >= REQUIRED_SESSIONS_FOR_PLAN,
      completedSessionsCount: sessionCount,
      requiredSessionsCount: REQUIRED_SESSIONS_FOR_PLAN,
      weeks: [],
    };
  }

  const path = pathRes.rows[0];
  const weeksRes = await query(
    `SELECT * FROM learning_path_weeks WHERE path_id = $1 ORDER BY week_number ASC`,
    [path.id]
  );

  return {
    id: path.id,
    title: path.title,
    totalWeeks: path.total_weeks,
    currentWeek: path.current_week,
    status: path.status,
    planSummary: path.plan_summary,
    canGenerate: sessionCount >= REQUIRED_SESSIONS_FOR_PLAN,
    completedSessionsCount: sessionCount,
    requiredSessionsCount: REQUIRED_SESSIONS_FOR_PLAN,
    weeks: weeksRes.rows.map((w: any) => ({
      id: w.id,
      weekNumber: w.week_number,
      focusArea: w.focus_area,
      description: w.description,
      days: w.exercises || [],
      completed: w.completed,
      completedAt: w.completed_at ? new Date(w.completed_at).toISOString() : null,
    })),
  };
}

/**
 * Complete a specific day task in a learning path.
 */
export async function completeDayTask(pathId: string, weekNumber: number, dayNumber: number, studentId: string): Promise<void> {
  const weekRes = await query(
    `SELECT id, exercises FROM learning_path_weeks WHERE path_id = $1 AND week_number = $2`,
    [pathId, weekNumber]
  );
  if (weekRes.rows.length === 0) return;

  const weekId = weekRes.rows[0].id;
  const days: DayTask[] = weekRes.rows[0].exercises || [];

  const targetDay = days.find(d => d.dayNumber === dayNumber);
  if (targetDay) {
    targetDay.completed = true;
    targetDay.completedAt = new Date().toISOString();
  }

  const allCompleted = days.every(d => d.completed);

  await query(
    `UPDATE learning_path_weeks SET exercises = $1, completed = $2, completed_at = $3 WHERE id = $4`,
    [JSON.stringify(days), allCompleted, allCompleted ? new Date() : null, weekId]
  );

  // Award +25 XP for completing a daily learning task
  try {
    await awardXP(studentId, 25, 'learning_path_day');
  } catch (err) {
    console.error('Failed to award XP for day completion:', err);
  }

  // Advance week if all days in week completed
  if (allCompleted) {
    const remaining = await query(
      `SELECT COUNT(*) as cnt FROM learning_path_weeks WHERE path_id = $1 AND completed = FALSE`,
      [pathId]
    );

    if (parseInt(remaining.rows[0].cnt, 10) === 0) {
      await query(`UPDATE learning_paths SET status = 'completed', updated_at = NOW() WHERE id = $1`, [pathId]);
    } else {
      await query(`UPDATE learning_paths SET current_week = $2, updated_at = NOW() WHERE id = $1`, [pathId, weekNumber + 1]);
    }
  }
}
