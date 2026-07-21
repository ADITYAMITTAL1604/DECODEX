import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../lib/api';

export default function TeacherDashboard() {
  const { data, loading, error } = useApiQuery<any>('/teacher/students');
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) return <div className="p-8 text-center text-on-surface-variant font-body">Loading classroom data...</div>;
  if (error) return <div className="p-8 text-center text-error font-body">Error: {error.message}</div>;

  const allStudents: any[] = data?.students ?? [];
  const filteredStudents = searchQuery.trim()
    ? allStudents.filter(s =>
        s.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allStudents;

  return (
    <main className="flex-grow w-full max-w-max-content-width mx-auto px-container-padding py-8 sm:py-12 text-on-surface">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-container/20 flex items-center justify-center text-primary shadow-inner">
            <span className="material-symbols-outlined text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>groups</span>
          </div>
          <div>
            <h1 className="font-display text-[28px] sm:text-[36px] font-extrabold text-primary">My Classroom</h1>
            <p className="text-on-surface-variant font-body text-base sm:text-lg mt-1">Manage and review your students' reading progress.</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-3xl border border-white/85 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <span className="font-display text-xs font-bold tracking-[0.08em] bg-white/80 border border-surface-variant/40 px-3 py-1 rounded-full uppercase">All Students ({allStudents.length})</span>
            {searchQuery && (
              <span className="font-display text-xs font-bold tracking-[0.08em] bg-secondary/10 border border-secondary/20 px-3 py-1 rounded-full text-secondary uppercase">
                Filtered ({filteredStudents.length})
              </span>
            )}
          </div>
          <div className="relative w-full sm:w-auto">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              type="text"
              placeholder="Search student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-72 glass-input pl-12 pr-4 py-3 rounded-2xl text-body font-body placeholder:text-outline/70 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredStudents.map((student: any) => {
            const initials = student.display_name?.substring(0, 2).toUpperCase() || 'ST';
            const accuracyPct = student.avg_error_rate != null ? 100 - Math.round(student.avg_error_rate * 100) : null;
            return (
              <div key={student.id} className="p-5 bg-white/30 border border-white/60 backdrop-blur-md rounded-2xl flex flex-col gap-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold font-display text-sm flex-shrink-0 shadow-inner">{initials}</div>
                    <div>
                      <h3 className="font-bold text-on-background font-display">{student.display_name}</h3>
                      <p className="text-xs text-on-surface-variant font-body">{student.grade_level ? `Grade ${student.grade_level}` : 'Grade not set'}</p>
                    </div>
                  </div>
                  <Link
                    to={`/teacher/student/${student.id}`}
                    className="inline-flex items-center gap-1 font-display text-xs font-bold text-primary bg-primary-container/20 px-3 py-1.5 rounded-full uppercase tracking-[0.08em] hover:bg-primary/10 transition-colors"
                  >
                    View <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 border-t border-b border-white/40 text-center">
                  <div>
                    <span className="block text-[10px] font-display font-bold uppercase tracking-[0.08em] text-outline">Sessions</span>
                    <span className="font-body text-sm font-semibold text-on-surface">{student.session_count}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-display font-bold uppercase tracking-[0.08em] text-outline">Avg WPM</span>
                    <span className="font-body text-sm font-semibold text-on-surface">{student.avg_wpm != null ? Math.round(student.avg_wpm) : '—'}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-display font-bold uppercase tracking-[0.08em] text-outline">Accuracy</span>
                    <span className="font-body text-sm font-semibold text-on-surface">{accuracyPct != null ? `${accuracyPct}%` : '—'}</span>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredStudents.length === 0 && (
            <div className="py-8 text-center text-on-surface-variant font-body">
              {searchQuery ? `No students matching "${searchQuery}".` : 'No students found.'}
            </div>
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b-2 border-white/60">
                <th className="py-4 px-4 font-display text-[12px] font-bold text-outline tracking-[0.08em] uppercase">Student Name</th>
                <th className="py-4 px-4 font-display text-[12px] font-bold text-outline tracking-[0.08em] uppercase">Grade</th>
                <th className="py-4 px-4 font-display text-[12px] font-bold text-outline tracking-[0.08em] uppercase text-right">Sessions</th>
                <th className="py-4 px-4 font-display text-[12px] font-bold text-outline tracking-[0.08em] uppercase text-right">Avg WPM</th>
                <th className="py-4 px-4 font-display text-[12px] font-bold text-outline tracking-[0.08em] uppercase">Avg Accuracy</th>
                <th className="py-4 px-4 font-display text-[12px] font-bold text-outline tracking-[0.08em] uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {filteredStudents.map((student: any) => {
                const initials = student.display_name?.substring(0, 2).toUpperCase() || 'ST';
                return (
                  <tr key={student.id} className="hover:bg-white/30 transition-all duration-150 group cursor-pointer">
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary-container/20 text-on-secondary-container flex items-center justify-center font-bold font-display text-sm shadow-inner">{initials}</div>
                        <span className="font-bold text-on-background group-hover:text-primary transition-colors">{student.display_name}</span>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-on-surface-variant font-body">{student.grade_level ?? '—'}</td>
                    <td className="py-5 px-4 text-right font-medium font-body">{student.session_count}</td>
                    <td className="py-5 px-4 text-right font-medium font-body">
                      {student.avg_wpm != null ? Math.round(student.avg_wpm) : '—'}
                    </td>
                    <td className="py-5 px-4 font-body">
                      {student.avg_error_rate != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-white/60 border border-white/80 rounded-full h-2.5 max-w-[100px]">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${100 - Math.round(student.avg_error_rate * 100)}%` }}></div>
                          </div>
                          <span className="font-semibold text-sm">{100 - Math.round(student.avg_error_rate * 100)}%</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-5 px-4 text-right">
                      <Link
                        to={`/teacher/student/${student.id}`}
                        className="inline-flex items-center gap-1 font-display text-xs font-bold text-primary hover:text-primary-container px-3 py-1.5 rounded-full hover:bg-primary/10 transition-all uppercase tracking-[0.08em]"
                      >
                        View Profile <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-on-surface-variant font-body">
                    {searchQuery ? `No students matching "${searchQuery}".` : 'No students found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
