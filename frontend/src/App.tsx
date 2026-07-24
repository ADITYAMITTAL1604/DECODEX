import React, { useState } from 'react';
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PassageSelection from './pages/PassageSelection';
import SessionActive from './pages/SessionActive';
import SessionResults from './pages/SessionResults';
import PracticePage from './pages/PracticePage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDetail from './pages/StudentDetail';
import ParentHome from './pages/ParentHome';
import ParentSessionReport from './pages/ParentSessionReport';
import ConsentConfirm from './pages/ConsentConfirm';

import LearningPathPage from './pages/LearningPathPage';
import StoryReaderPage from './pages/StoryReaderPage';
import CopilotPanel from './pages/CopilotPanel';

function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await logout();
    navigate('/login');
  };

  const getHomeRoute = () => {
    if (!user) return '/about';
    if (user.role === 'parent') return '/parent/home';
    if (user.role === 'teacher' || user.role === 'admin') return '/teacher/dashboard';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-on-background font-body text-body selection:bg-primary-container selection:text-on-primary-container">
      <header className="glass-header text-primary shadow-sm sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-container-padding h-20 max-w-max-content-width mx-auto">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className="font-display text-[28px] sm:text-[32px] font-bold text-primary flex items-center gap-2"
          >
            Decodex
          </Link>

          {/* Desktop Navigation */}
          <nav className="h-full hidden md:flex">
            {isAuthenticated ? (
              <div className="flex items-center gap-6 h-full">
                <Link
                  to={getHomeRoute()}
                  className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center font-display text-[14px] font-bold uppercase tracking-[0.08em] h-full border-b-2 border-transparent hover:border-primary"
                >
                  Dashboard
                </Link>
                {user?.role === 'student' && (
                  <>
                    <Link
                      to="/learning-path"
                      className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center font-display text-[14px] font-bold uppercase tracking-[0.08em] h-full border-b-2 border-transparent hover:border-primary"
                    >
                      Learning Path
                    </Link>
                    <Link
                      to="/stories"
                      className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center font-display text-[14px] font-bold uppercase tracking-[0.08em] h-full border-b-2 border-transparent hover:border-primary"
                    >
                      AI Stories
                    </Link>
                  </>
                )}
                {(user?.role === 'teacher' || user?.role === 'admin') && (
                  <Link
                    to="/teacher/dashboard"
                    className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center font-display text-[14px] font-bold uppercase tracking-[0.08em] h-full border-b-2 border-transparent hover:border-primary"
                  >
                    Classroom
                  </Link>
                )}

                <div className="flex items-center gap-4 ml-4 pl-6 border-l border-surface-variant">
                  <span className="font-body text-on-surface-variant">
                    Hi, <span className="font-bold text-on-surface">{user?.display_name}</span>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="font-display text-[14px] font-bold uppercase tracking-[0.08em] text-primary border border-primary px-4 py-2 rounded-full hover:bg-primary-container hover:text-on-primary-container transition-colors duration-200 cursor-pointer"
                  >
                    Logout
                  </button>
                  <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold font-display text-sm border-2 border-surface-variant flex-shrink-0">
                    {user?.display_name?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex gap-4 items-center h-full">
                <Link
                  to="/login"
                  className="font-display text-[14px] font-bold uppercase tracking-[0.08em] text-on-surface-variant hover:text-primary transition"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="font-display text-[14px] font-bold uppercase tracking-[0.08em] bg-primary text-on-primary px-6 py-2 rounded-full hover:bg-primary-container hover:text-on-primary-container transition shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-primary hover:bg-surface-container transition-colors cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            <span className="material-symbols-outlined text-3xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-surface border-b border-surface-variant px-container-padding py-4 flex flex-col gap-4 shadow-md animate-in fade-in slide-in-from-top duration-200">
            {isAuthenticated ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 pb-3 border-b border-surface-variant">
                  <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold font-display text-sm border-2 border-surface-variant flex-shrink-0">
                    {user?.display_name?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-on-surface">{user?.display_name}</span>
                    <span className="text-xs uppercase tracking-[0.08em] text-on-surface-variant">{user?.role}</span>
                  </div>
                </div>
                <Link
                  to={getHomeRoute()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-display text-[14px] font-bold uppercase tracking-[0.08em] text-on-surface-variant hover:text-primary py-2"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left font-display text-[14px] font-bold uppercase tracking-[0.08em] text-error py-2 mt-1 border-t border-surface-variant pt-3 cursor-pointer"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-display text-[14px] font-bold uppercase tracking-[0.08em] text-on-surface-variant hover:text-primary py-2 text-center border border-surface-variant rounded-full"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-display text-[14px] font-bold uppercase tracking-[0.08em] bg-primary text-on-primary py-2 rounded-full text-center shadow-sm"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 flex-grow w-full">
        <Routes>
          {/* Public Front Intro / About Page */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/consent/:token" element={<ConsentConfirm />} />

          {/* Student Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student', 'admin']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/passages" element={<PassageSelection />} />
            <Route path="/session/:id" element={<SessionActive />} />
            <Route path="/sessions/:id/results" element={<SessionResults />} />
            <Route path="/sessions/:id/practice" element={<PracticePage />} />
            <Route path="/learning-path" element={<LearningPathPage />} />
            <Route path="/stories" element={<StoryReaderPage />} />
          </Route>

          {/* Teacher Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['teacher', 'admin']} />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
            <Route path="/teacher/student/:id" element={<StudentDetail />} />
            <Route path="/copilot/:studentId" element={<CopilotPanel />} />
          </Route>

          {/* Parent Protected Routes */}
          <Route element={<ProtectedRoute allowedRoles={['parent', 'admin']} />}>
            <Route path="/parent/home" element={<ParentHome />} />
            <Route path="/parent/children/:studentId/sessions/:sessionId" element={<ParentSessionReport />} />
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
