import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useApiQuery } from '../lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StudentDetail() {
  const { id } = useParams();
  const { data: trendsData, loading } = useApiQuery<any>(`/teacher/students/${id}/trends`);

  if (loading) return <div className="p-8 text-center text-on-surface-variant font-body">Loading student data...</div>;

  return (
    <main className="flex-grow w-full max-w-max-content-width mx-auto px-container-padding py-8 sm:py-12 text-on-surface">
      <Link to="/teacher/dashboard" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary font-display text-sm font-bold tracking-[0.08em] uppercase transition-all group mb-6">
        <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
        Back to Classroom
      </Link>

      <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-primary mb-8">Student Progress Profile</h1>

      {trendsData?.trends && trendsData.trends.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-card-gap">
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">Reading Speed (WPM)</h3>
              <span className="material-symbols-outlined text-primary">trending_up</span>
            </div>
            <div className="h-64 flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsData.trends.map((t: any, i: number) => ({ name: `S${i+1}`, wpm: t.words_per_minute != null ? Math.round(t.words_per_minute) : 0 }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1d8d4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6f797c', fontFamily: 'Nunito Sans'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6f797c', fontFamily: 'Nunito Sans'}} />
                  <Tooltip contentStyle={{ borderRadius: '16px', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 8px 24px rgba(45, 41, 38, 0.1)', fontFamily: 'Nunito Sans' }} />
                  <Line type="monotone" dataKey="wpm" stroke="#006474" strokeWidth={3} dot={{ r: 4, fill: '#006474' }} activeDot={{ r: 6, fill: '#006474' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/80 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.08em] text-on-surface-variant">Error Rate (%)</h3>
              <span className="material-symbols-outlined text-error">trending_down</span>
            </div>
            <div className="h-64 flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendsData.trends.map((t: any, i: number) => ({ name: `S${i+1}`, errorRate: Math.round(t.error_rate * 100) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1d8d4" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6f797c', fontFamily: 'Nunito Sans'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#6f797c', fontFamily: 'Nunito Sans'}} />
                  <Tooltip contentStyle={{ borderRadius: '16px', background: 'rgba(255, 255, 255, 0.95)', border: '1px solid rgba(255, 255, 255, 0.8)', boxShadow: '0 8px 24px rgba(45, 41, 38, 0.1)', fontFamily: 'Nunito Sans' }} />
                  <Line type="monotone" dataKey="errorRate" stroke="#ba1a1a" strokeWidth={3} dot={{ r: 4, fill: '#ba1a1a' }} activeDot={{ r: 6, fill: '#ba1a1a' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-8 border border-white/80 text-center font-body text-on-surface-variant shadow-sm flex flex-col items-center justify-center">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-primary-container/20 text-primary flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-4xl" style={{fontVariationSettings: "'FILL' 1"}}>bar_chart</span>
          </div>
          <p className="text-lg">No reading sessions completed by this student yet.</p>
        </div>
      )}
    </main>
  );
}
