import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch, useApiQuery } from '../lib/api';

type Scope = 'class' | 'selected';

interface Student {
  id: string;
  display_name: string;
  grade_level?: number | null;
  // Health score fields
  latest_health_score?: number | null;
  health_risk_level?: 'critical' | 'high' | 'medium' | 'good' | 'excellent' | null;
  health_score_date?: string | null;
  // Error profile fields
  rev_count?: number | null;
  sub_count?: number | null;
  omi_count?: number | null;
  ins_count?: number | null;
  bld_count?: number | null;
  pac_count?: number | null;
  uncertain_count?: number | null;
  // Learning path
  learning_path_status?: string | null;
  learning_path_week?: number | null;
}

const ERROR_CATEGORIES: Record<string, { label: string; color: string }> = {
  rev_count: { label: 'Reversals', color: 'purple' },
  sub_count: { label: 'Substitutions', color: 'yellow' },
  omi_count: { label: 'Omissions', color: 'emerald' },
  ins_count: { label: 'Insertions', color: 'orange' },
  bld_count: { label: 'Blends', color: 'blue' },
  pac_count: { label: 'Pacing', color: 'gray' },
  uncertain_count: { label: 'Uncertain', color: 'slate' },
};

function getTopErrorCategory(student: Student): { key: string; label: string; count: number; color: string } | null {
  const errors = [
    { key: 'rev_count', count: student.rev_count ?? 0 },
    { key: 'sub_count', count: student.sub_count ?? 0 },
    { key: 'omi_count', count: student.omi_count ?? 0 },
    { key: 'ins_count', count: student.ins_count ?? 0 },
    { key: 'bld_count', count: student.bld_count ?? 0 },
    { key: 'pac_count', count: student.pac_count ?? 0 },
    { key: 'uncertain_count', count: student.uncertain_count ?? 0 },
  ].filter(e => e.count > 0);

  if (errors.length === 0) return null;

  errors.sort((a, b) => b.count - a.count);
  const top = errors[0];
  const meta = ERROR_CATEGORIES[top.key];
  return { ...top, label: meta.label, color: meta.color };
}

function getRiskLevelColor(riskLevel: string | null | undefined): string {
  switch (riskLevel) {
    case 'excellent': return 'text-emerald-700 bg-emerald-100';
    case 'good': return 'text-green-700 bg-green-100';
    case 'medium': return 'text-amber-700 bg-amber-100';
    case 'high': return 'text-orange-700 bg-orange-100';
    case 'critical': return 'text-red-700 bg-red-100';
    default: return 'text-on-surface-variant bg-surface-container-high';
  }
}

function getRiskLevelLabel(riskLevel: string | null | undefined): string {
  if (!riskLevel) return 'No data';
  return riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1);
}

interface Passage {
  id: string;
  title: string;
  grade_level?: number | null;
  word_count?: number | null;
}

interface Assignment {
  id: string;
  title: string;
  instructions?: string | null;
  due_date?: string | null;
  passage_title: string;
  assigned_count: number;
  completed_count: number;
  average_score?: number | null;
  status: 'draft' | 'active' | 'archived';
}

interface AssignmentStudent {
  id: string;
  student_id: string;
  display_name: string;
  grade_level?: number | null;
  status: 'assigned' | 'in_progress' | 'completed' | 'late';
  score?: number | null;
  session_id?: string | null;
  completed_at?: string | null;
  reward_xp?: number;
}

interface AssignmentDetail {
  assignment: Assignment;
  students: AssignmentStudent[];
}

function formatDueDate(value?: string | null): string {
  if (!value) return 'No due date';
  return `Due ${new Date(value).toLocaleDateString()}`; 
}

export default function AssignmentManager() {
  const { data: assignmentData, loading, error, refetch } = useApiQuery<{ assignments: Assignment[] }>('/assignments/teacher');
  const { data: studentData } = useApiQuery<{ students: Student[] }>('/teacher/students');
  const { data: passageData } = useApiQuery<{ passages: Passage[] }>('/passages');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [passageId, setPassageId] = useState('');
  const [scope, setScope] = useState<Scope>('class');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const students = studentData?.students ?? [];
  const passages = passageData?.passages ?? [];
  const assignments = assignmentData?.assignments ?? [];

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(current => current.includes(studentId)
      ? current.filter(id => id !== studentId)
      : [...current, studentId]);
  };

  const createAssignment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await apiFetch('/assignments', {
        method: 'POST',
        body: JSON.stringify({
          title,
          instructions,
          due_date: dueDate ? new Date(`${dueDate}T23:59:59`).toISOString() : null,
          passage_id: passageId,
          scope,
          student_ids: scope === 'selected' ? selectedStudentIds : undefined,
        }),
      });
      setTitle('');
      setInstructions('');
      setDueDate('');
      setPassageId('');
      setSelectedStudentIds([]);
      setMessage('Assignment created and shared with students.');
      refetch();
    } catch (createError: any) {
      setMessage(createError.message || 'Could not create the assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  const showProgress = async (assignmentId: string) => {
    if (detail?.assignment.id === assignmentId) {
      setDetail(null);
      return;
    }

    setDetailLoading(assignmentId);
    try {
      const result = await apiFetch<AssignmentDetail>(`/assignments/${assignmentId}`);
      setDetail(result);
    } catch (detailError: any) {
      setMessage(detailError.message || 'Could not load assignment progress.');
    } finally {
      setDetailLoading(null);
    }
  };

  if (loading) return <div className="glass-card rounded-3xl border border-white/85 p-6 text-on-surface-variant">Loading assignments...</div>;
  if (error) return <div className="glass-card rounded-3xl border border-error/30 p-6 text-error">Could not load assignments: {error.message}</div>;

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-3xl border border-white/85 p-6 md:p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="font-display text-xl font-bold text-on-surface">Create assignment</h2>
          <p className="font-body text-sm text-on-surface-variant mt-1">Give the class a focused reading exercise without interrupting free practice.</p>
        </div>
        <form onSubmit={createAssignment} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="block">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-on-surface-variant">Title</span>
            <input required minLength={3} value={title} onChange={event => setTitle(event.target.value)} placeholder="Week 3 fluency check" className="mt-2 w-full glass-input px-4 py-3 rounded-xl" />
          </label>
          <label className="block">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-on-surface-variant">Reading passage</span>
            <select required value={passageId} onChange={event => setPassageId(event.target.value)} className="mt-2 w-full glass-input px-4 py-3 rounded-xl">
              <option value="">Choose a passage</option>
              {passages.map(passage => <option key={passage.id} value={passage.id}>{passage.title}{passage.grade_level ? ` (Grade ${passage.grade_level})` : ''}</option>)}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-on-surface-variant">Instructions</span>
            <textarea value={instructions} onChange={event => setInstructions(event.target.value)} rows={3} placeholder="What should students focus on while they read?" className="mt-2 w-full glass-input px-4 py-3 rounded-xl resize-y" />
          </label>
          <label className="block">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-on-surface-variant">Due date</span>
            <input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} className="mt-2 w-full glass-input px-4 py-3 rounded-xl" />
          </label>
          <fieldset className="block">
            <legend className="font-display text-xs font-bold uppercase tracking-wider text-on-surface-variant">Assign to</legend>
            <div className="mt-2 flex gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-on-surface"><input type="radio" checked={scope === 'class'} onChange={() => setScope('class')} /> Whole class</label>
              <label className="inline-flex items-center gap-2 text-sm text-on-surface"><input type="radio" checked={scope === 'selected'} onChange={() => setScope('selected')} /> Selected students</label>
            </div>
          </fieldset>
          {scope === 'selected' && (
            <div className="md:col-span-2 border border-surface-variant/50 rounded-xl p-4 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <p className="font-display text-xs font-bold uppercase tracking-wider text-on-surface-variant">Students</p>
                <span className="font-body text-xs text-on-surface-variant">{students.length} available</span>
              </div>
              <div className="space-y-2">
                {students.map(student => {
                  const topError = getTopErrorCategory(student);
                  const riskColor = getRiskLevelColor(student.health_risk_level);
                  const riskLabel = getRiskLevelLabel(student.health_risk_level);
                  const hasLearningPath = student.learning_path_status === 'active';
                  return (
                    <label key={student.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/50 hover:bg-white/70 border border-surface-variant/50 transition-colors cursor-pointer">
                      <input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={() => toggleStudent(student.id)} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-body font-medium text-on-surface truncate">{student.display_name}{student.grade_level ? ` (Grade ${student.grade_level})` : ''}</span>
                          {student.latest_health_score != null && (
                            <span className={`font-display text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${riskColor}`}>
                              {riskLabel} ({student.latest_health_score})
                            </span>
                          )}
                          {hasLearningPath && (
                            <span className="font-display text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-container/30 text-primary">
                              Learning Path (Wk {student.learning_path_week})
                            </span>
                          )}
                        </div>
                        {topError && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-on-surface-variant">
                            <span className="material-symbols-outlined text-[12px]">psychology</span>
                            <span>Top need: </span>
                            <span className={`font-medium px-1.5 py-0.5 rounded text-${topError.color}-700 bg-${topError.color}-100`}>
                              {topError.label} ({topError.count})
                            </span>
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              {students.length === 0 && (
                <p className="font-body text-sm text-on-surface-variant text-center py-4">No students available in your class.</p>
              )}
            </div>
          )}
          <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 sm:items-center">
            <button type="submit" disabled={submitting || (scope === 'selected' && selectedStudentIds.length === 0)} className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary px-5 py-3 rounded-xl font-display text-sm font-bold disabled:opacity-50">
              <span className="material-symbols-outlined text-lg">assignment_add</span>
              {submitting ? 'Creating...' : 'Create assignment'}
            </button>
            {message && <p role="status" className="font-body text-sm text-on-surface-variant">{message}</p>}
          </div>
        </form>
      </section>

      <section className="glass-card rounded-3xl border border-white/85 p-6 md:p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="font-display text-xl font-bold text-on-surface">Assignments</h2>
            <p className="font-body text-sm text-on-surface-variant mt-1">Completion and score progress for each activity.</p>
          </div>
          <span className="font-display text-sm font-bold text-primary">{assignments.length}</span>
        </div>
        {assignments.length === 0 ? (
          <p className="font-body text-on-surface-variant py-6 text-center">No assignments yet.</p>
        ) : (
          <div className="space-y-3">
            {assignments.map(assignment => (
              <article key={assignment.id} className="border border-surface-variant/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-display font-bold text-on-surface">{assignment.title}</h3>
                  <p className="font-body text-sm text-on-surface-variant mt-1">{assignment.passage_title} | {formatDueDate(assignment.due_date)}</p>
                  {assignment.instructions && <p className="font-body text-sm text-on-surface-variant mt-2">{assignment.instructions}</p>}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="font-display font-bold text-primary">{assignment.assigned_count}</p><p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Assigned</p></div>
                    <div><p className="font-display font-bold text-primary">{assignment.completed_count}</p><p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Finished</p></div>
                    <div><p className="font-display font-bold text-primary">{assignment.average_score ?? '-'}</p><p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Avg score</p></div>
                  </div>
                  <button onClick={() => showProgress(assignment.id)} className="inline-flex items-center gap-1 border border-primary/30 text-primary px-3 py-2 rounded-xl font-display text-xs font-bold whitespace-nowrap">
                    {detail?.assignment.id === assignment.id ? 'Hide progress' : 'View progress'}
                    <span className="material-symbols-outlined text-base">visibility</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {detailLoading && <p className="font-body text-sm text-on-surface-variant mt-5">Loading student progress...</p>}
        {detail && (
          <div className="mt-6 border-t border-surface-variant/50 pt-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-on-surface">{detail.assignment.title} progress</h3>
                <p className="font-body text-sm text-on-surface-variant">Student scores and follow-up actions.</p>
              </div>
              <button onClick={() => setDetail(null)} className="p-2 text-on-surface-variant hover:text-primary" aria-label="Close assignment progress">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-variant/50">
                    <th className="py-3 pr-3 font-display text-xs uppercase tracking-wider text-on-surface-variant">Student</th>
                    <th className="py-3 px-3 font-display text-xs uppercase tracking-wider text-on-surface-variant">Status</th>
                    <th className="py-3 px-3 font-display text-xs uppercase tracking-wider text-on-surface-variant">Score</th>
                    <th className="py-3 px-3 font-display text-xs uppercase tracking-wider text-on-surface-variant">Completed</th>
                    <th className="py-3 pl-3 font-display text-xs uppercase tracking-wider text-on-surface-variant text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.students.map(student => (
                    <tr key={student.id} className="border-b border-surface-variant/30">
                      <td className="py-3 pr-3 font-body font-medium text-on-surface">{student.display_name}{student.grade_level ? ` (Grade ${student.grade_level})` : ''}</td>
                      <td className="py-3 px-3 font-body text-sm text-on-surface-variant capitalize">{student.status.replace('_', ' ')}</td>
                      <td className="py-3 px-3 font-display font-bold text-primary">{student.score != null ? `${student.score}/100` : '-'}</td>
                      <td className="py-3 px-3 font-body text-sm text-on-surface-variant">{student.completed_at ? new Date(student.completed_at).toLocaleDateString() : '-'}</td>
                      <td className="py-3 pl-3 text-right">
                        <div className="inline-flex gap-2">
                          <Link to={`/copilot/${student.student_id}`} className="text-secondary font-display text-xs font-bold">Copilot</Link>
                          {student.session_id && <Link to={`/sessions/${student.session_id}/results`} className="text-primary font-display text-xs font-bold">Results</Link>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
