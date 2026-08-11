import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useApiQuery } from '../lib/api';
import { Skeleton, SkeletonText } from '../components/Skeleton';

export default function TeacherDashboard() {
  const { data, loading, error } = useApiQuery<any>('/teacher/students');
  const { data: heatmapData } = useApiQuery<any>('/classroom/heatmap');
  const { data: weaknessData } = useApiQuery<any>('/classroom/weaknesses');
  const { data: skillData } = useApiQuery<any>('/classroom/skill-distribution');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'students' | 'heatmap' | 'weaknesses'>('students');

  if (loading) return (
    <div className="flex-grow w-full max-w-max-content-width mx-auto px-4 py-8">
      <Skeleton className="h-16 w-64 mb-10" />
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
      <Skeleton className="h-10 w-full mb-6" />
      <SkeletonText lines={10} className="w-full" />
    </div>
  );
  if (error) return <div className="p-8 text-center text-error font-body">Error: {error.message}</div>;

  const allStudents: any[] = data?.students ?? [];
  const filteredStudents = searchQuery.trim()
    ? allStudents.filter(s =>
        s.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allStudents;

  const heatmap = heatmapData?.heatmap || [];
  const weaknesses = weaknessData?.weaknesses || [];
  const skillDist = skillData?.distribution;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.main
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="flex-grow w-full max-w-max-content-width mx-auto px-4 py-6 sm:py-8 text-on-surface"
    >
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary-container/20 flex items-center justify-center text-primary shadow-inner">
            <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
          </div>
          <div>
            <h1 className="font-display text-[28px] sm:text-[36px] font-extrabold text-primary">My Classroom</h1>
            <p className="text-on-surface-variant font-body text-sm sm:text-base mt-1 tracking-wide">Classroom Analytics &amp; AI Copilot Hub</p>
          </div>
        </div>
      </motion.div>

      {/* Overview Cards Row */}
      {skillDist && (
        <motion.div variants={itemVariants} className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
          <div className="glass-card p-3 border text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-700 mb-1">Excellent</p>
            <p className="font-mono text-xl font-bold text-emerald-800">{skillDist.excellent}</p>
          </div>
          <div className="glass-card p-3 border text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-green-700 mb-1">Good</p>
            <p className="font-mono text-xl font-bold text-green-800">{skillDist.good}</p>
          </div>
          <div className="glass-card p-3 border text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">Medium</p>
            <p className="font-mono text-xl font-bold text-amber-800">{skillDist.medium}</p>
          </div>
          <div className="glass-card p-3 border text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-orange-700 mb-1">High Risk</p>
            <p className="font-mono text-xl font-bold text-orange-800">{skillDist.high}</p>
          </div>
          <div className="glass-card p-3 border text-center col-span-3 sm:col-span-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-red-700 mb-1">Critical</p>
            <p className="font-mono text-xl font-bold text-red-800">{skillDist.critical}</p>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex gap-1 mb-5 border-b border-color-[var(--color-border)] pb-0">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border-b-2 -mb-px ${
            activeTab === 'students' ? 'border-primary text-primary bg-transparent' : 'border-transparent text-on-surface-variant hover:text-primary'
          }`}
        >
          Students ({allStudents.length})
        </button>
        <button
          onClick={() => setActiveTab('heatmap')}
          className={`px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border-b-2 -mb-px ${
            activeTab === 'heatmap' ? 'border-primary text-primary bg-transparent' : 'border-transparent text-on-surface-variant hover:text-primary'
          }`}
        >
          Error Heatmap
        </button>
        <button
          onClick={() => setActiveTab('weaknesses')}
          className={`px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border-b-2 -mb-px ${
            activeTab === 'weaknesses' ? 'border-primary text-primary bg-transparent' : 'border-transparent text-on-surface-variant hover:text-primary'
          }`}
        >
          Class Weaknesses
        </button>
      </motion.div>

      {activeTab === 'students' && (
        <motion.div variants={itemVariants} className="glass-card rounded-3xl border border-white/85 p-6 md:p-8 shadow-sm">
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

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b-2 border-white/60">
                  <th className="py-4 px-4 font-display text-[12px] font-bold text-outline tracking-[0.08em] uppercase">Student Name</th>
                  <th className="py-4 px-4 font-display text-[12px] font-bold text-outline tracking-[0.08em] uppercase">Grade</th>
                  <th className="py-4 px-4 font-display text-[12px] font-bold text-outline tracking-[0.08em] uppercase text-right">Sessions</th>
                  <th className="py-4 px-4 font-display text-[12px] font-bold text-outline tracking-[0.08em] uppercase text-right">Avg WPM</th>
                  <th className="py-4 px-4 font-display text-[12px] font-bold text-outline tracking-[0.08em] uppercase">Accuracy</th>
                  <th className="py-4 px-4 font-display text-[12px] font-bold text-outline tracking-[0.08em] uppercase text-right">Actions</th>
                </tr>
              </thead>
              <motion.tbody variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-white/40">
                {filteredStudents.map((student: any) => {
                  const initials = student.display_name?.substring(0, 2).toUpperCase() || 'ST';
                  return (
                    <motion.tr variants={itemVariants} key={student.id} className="hover:bg-white/30 transition-all duration-150 group">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary-container/20 text-on-secondary-container flex items-center justify-center font-bold font-display text-sm shadow-inner">{initials}</div>
                          <span className="font-bold text-on-background group-hover:text-primary transition-colors">{student.display_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-on-surface-variant font-body">{student.grade_level ?? '—'}</td>
                      <td className="py-3 px-3 text-right font-mono font-medium">{student.session_count}</td>
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        {student.avg_wpm != null ? Math.round(student.avg_wpm) : '—'}
                      </td>
                      <td className="py-3 px-3 font-body">
                        {student.avg_error_rate != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-white/60 border border-white/80 rounded-full h-2 max-w-[80px]">
                              <div className="bg-primary h-2 rounded-full" style={{ width: `${100 - Math.round(student.avg_error_rate * 100)}%` }}></div>
                            </div>
                            <span className="font-semibold text-sm font-mono">{100 - Math.round(student.avg_error_rate * 100)}%</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/copilot/${student.id}`}
                            className="inline-flex items-center gap-1 font-display text-xs font-bold text-secondary bg-secondary-container/20 hover:bg-secondary-container/40 px-3 py-1.5 rounded-full transition-all uppercase tracking-[0.08em]"
                          >
                            <span className="material-symbols-outlined text-[16px]">smart_toy</span> Copilot
                          </Link>
                          <Link
                            to={`/teacher/student/${student.id}`}
                            className="inline-flex items-center gap-1 font-display text-xs font-bold text-primary hover:text-primary-container px-3 py-1.5 rounded-full hover:bg-primary/10 transition-all uppercase tracking-[0.08em]"
                          >
                            Profile <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                          </Link>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </motion.tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Heatmap Tab */}
      {activeTab === 'heatmap' && (
        <motion.div variants={itemVariants} className="glass-card rounded-3xl border border-white/85 p-6 md:p-8 shadow-sm overflow-x-auto">
          <h2 className="font-display text-xl font-bold text-on-surface mb-4">Orton-Gillingham Error Distribution Heatmap</h2>
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b-2 border-white/60">
                <th className="py-3 px-3 font-display text-[11px] font-bold text-outline uppercase">Student</th>
                <th className="py-3 px-3 font-display text-[11px] font-bold text-purple-700 uppercase text-center">REV (Reversal)</th>
                <th className="py-3 px-3 font-display text-[11px] font-bold text-yellow-700 uppercase text-center">SUB (Substitution)</th>
                <th className="py-3 px-3 font-display text-[11px] font-bold text-emerald-700 uppercase text-center">OMI (Omission)</th>
                <th className="py-3 px-3 font-display text-[11px] font-bold text-orange-700 uppercase text-center">INS (Insertion)</th>
                <th className="py-3 px-3 font-display text-[11px] font-bold text-blue-700 uppercase text-center">BLD (Blend)</th>
                <th className="py-3 px-3 font-display text-[11px] font-bold text-gray-700 uppercase text-center">PAC (Pacing)</th>
                <th className="py-3 px-3 font-display text-[11px] font-bold text-primary uppercase text-center">Health Score</th>
              </tr>
            </thead>
            <motion.tbody variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-white/40">
              {heatmap.map((row: any) => (
                <motion.tr variants={itemVariants} key={row.studentId} className="hover:bg-white/30">
                  <td className="py-3 px-3 font-bold text-on-surface font-display">{row.studentName}</td>
                  <td className={`py-3 px-3 text-center font-bold ${row.rev > 2 ? 'bg-purple-100 text-purple-900' : 'text-on-surface-variant'}`}>{row.rev}</td>
                  <td className={`py-3 px-3 text-center font-bold ${row.sub > 4 ? 'bg-yellow-100 text-yellow-900' : 'text-on-surface-variant'}`}>{row.sub}</td>
                  <td className={`py-3 px-3 text-center font-bold ${row.omi > 2 ? 'bg-emerald-100 text-emerald-900' : 'text-on-surface-variant'}`}>{row.omi}</td>
                  <td className={`py-3 px-3 text-center font-bold ${row.ins > 2 ? 'bg-orange-100 text-orange-900' : 'text-on-surface-variant'}`}>{row.ins}</td>
                  <td className={`py-3 px-3 text-center font-bold ${row.bld > 2 ? 'bg-blue-100 text-blue-900' : 'text-on-surface-variant'}`}>{row.bld}</td>
                  <td className={`py-3 px-3 text-center font-bold ${row.pac > 2 ? 'bg-gray-100 text-gray-900' : 'text-on-surface-variant'}`}>{row.pac}</td>
                  <td className="py-3 px-3 text-center font-extrabold text-primary font-display">{row.healthScore ?? '—'}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </motion.div>
      )}

      {/* Weaknesses Tab */}
      {activeTab === 'weaknesses' && (
        <motion.div variants={itemVariants} className="glass-card rounded-3xl border border-white/85 p-6 md:p-8 shadow-sm space-y-4">
          <h2 className="font-display text-xl font-bold text-on-surface mb-2">Class-Wide Error Analysis</h2>
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-4">
            {weaknesses.map((w: any) => (
              <motion.div variants={itemVariants} key={w.category} className="p-4 rounded-2xl bg-white/40 border border-surface-container-highest flex items-center justify-between">
                <div>
                  <span className="font-display text-sm font-bold text-on-surface">{w.categoryName} ({w.category})</span>
                  <p className="font-body text-xs text-on-surface-variant">{w.affectedStudents} student(s) affected ({w.percentageOfClass}% of class)</p>
                </div>
                <span className="font-display text-2xl font-extrabold text-primary">{w.totalOccurrences} <span className="text-xs font-normal text-on-surface-variant">total errors</span></span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </motion.main>
  );
}
