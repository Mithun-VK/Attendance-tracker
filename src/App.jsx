import React, { useState, useEffect } from 'react';
import './App.css';

const App = () => {
  const courses = [
    { code: 'CS23601', name: 'CRYPTOGRAPHY AND SYSTEM SECURITY', sessionsPerWeek: 5, color: '#6366f1' },
    { code: 'CS23602', name: 'COMPILER DESIGN', sessionsPerWeek: 5, color: '#8b5cf6' },
    { code: 'CS23603', name: 'MACHINE LEARNING', sessionsPerWeek: 7, color: '#ec4899' },
    { code: 'CS23U02', name: 'PERSPECTIVES OF SUSTAINABILITY DEVELOPMENT', sessionsPerWeek: 4, color: '#10b981' },
    { code: 'CS23057', name: 'DEEP LEARNING', sessionsPerWeek: 3, color: '#f59e0b' },
    { code: 'CS23007', name: 'NATURAL LANGUAGE PROCESSING', sessionsPerWeek: 3, color: '#06b6d4' },
    { code: 'CS23045', name: 'CIP', sessionsPerWeek: 4, color: '#ef4444' },
  ];

  // attendance state
  const [attendance, setAttendance] = useState(() => {
    const saved = localStorage.getItem('attendanceData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const fixed = {};
        courses.forEach(course => {
          const d = parsed[course.code] || {};
          fixed[course.code] = {
            attended: Number(d.attended) || 0,
            total: Number(d.total) || 0,
          };
        });
        return fixed;
      } catch {
        // fall through
      }
    }
    const initial = {};
    courses.forEach(course => {
      initial[course.code] = { attended: 0, total: 0 };
    });
    return initial;
  });

  // animation state
  const [animatingCard, setAnimatingCard] = useState(null);
  const [actionType, setActionType] = useState(null);

  // modal state
  const [sessionModal, setSessionModal] = useState({
    open: false,
    courseCode: null,
    mode: null, // 'attended' or 'missed'
  });

  useEffect(() => {
    localStorage.setItem('attendanceData', JSON.stringify(attendance));
  }, [attendance]);

  // open modal instead of prompt
  const openSessionModal = (courseCode, mode) => {
    setSessionModal({
      open: true,
      courseCode,
      mode,
    });
  };

  const closeSessionModal = () => {
    setSessionModal({
      open: false,
      courseCode: null,
      mode: null,
    });
  };

  // when user selects 1 / 2 / 4 in modal
  const applySessionChange = (count) => {
    const { courseCode, mode } = sessionModal;
    if (!courseCode || !mode) return;

    setAnimatingCard(courseCode);
    setActionType(mode);

    if (mode === 'attended') {
      setAttendance(prev => {
        const prevData = prev[courseCode] || { attended: 0, total: 0 };
        const attended = (Number(prevData.attended) || 0) + count;
        const total = (Number(prevData.total) || 0) + count;
        return {
          ...prev,
          [courseCode]: { attended, total },
        };
      });
    } else if (mode === 'missed') {
      setAttendance(prev => {
        const prevData = prev[courseCode] || { attended: 0, total: 0 };
        const attended = Number(prevData.attended) || 0;
        const total = (Number(prevData.total) || 0) + count;
        return {
          ...prev,
          [courseCode]: { attended, total },
        };
      });
    }

    setTimeout(() => {
      setAnimatingCard(null);
      setActionType(null);
    }, 400);

    closeSessionModal();
  };

  // handlers used by buttons
  const handleAttended = (courseCode) => {
    openSessionModal(courseCode, 'attended');
  };

  const handleMissed = (courseCode) => {
    openSessionModal(courseCode, 'missed');
  };

  const getPercentage = (courseCode) => {
    const data = attendance[courseCode] || { attended: 0, total: 0 };
    if (!data.total) return 0;
    const pct = (Number(data.attended) / Number(data.total)) * 100;
    if (!Number.isFinite(pct)) return 0;
    return Number(pct.toFixed(1));
  };

  const getStatus = (percentage) => {
    if (percentage >= 85) return { label: 'Excellent', class: 'excellent' };
    if (percentage >= 75) return { label: 'Good', class: 'good' };
    if (percentage >= 65) return { label: 'Average', class: 'average' };
    if (percentage >= 50) return { label: 'Low', class: 'low' };
    return { label: 'Critical', class: 'critical' };
  };

  const handleUndo = (courseCode) => {
    const data = attendance[courseCode] || { attended: 0, total: 0 };
    if (!data.total) return;

    setAttendance(prev => ({
      ...prev,
      [courseCode]: {
        attended: data.attended > 0 ? data.attended - 1 : 0,
        total: data.total - 1,
      },
    }));
  };

  const resetAll = () => {
    if (!window.confirm('⚠️ This will delete all your attendance data. Are you sure?')) return;
    const initial = {};
    courses.forEach(course => {
      initial[course.code] = { attended: 0, total: 0 };
    });
    setAttendance(initial);
    localStorage.removeItem('attendanceData');
  };

  return (
    <div className="app-container">
      <div className="bg-gradient" />

      <div className="content-wrapper">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <div className="logo-section">
              <div className="logo-icon">📊</div>
              <div className="header-text">
                <h1 className="main-title">Attendance Pro</h1>
                <p className="subtitle">Tap Attended or Missed for each class</p>
              </div>
            </div>
          </div>
        </header>

        {/* Courses */}
        <div className="courses-section">
          <div className="section-header">
            <h2 className="section-title">Your Subjects</h2>
            <span className="course-count">{courses.length} courses</span>
          </div>

          <div className="courses-grid">
            {courses.map((course, index) => {
              const data = attendance[course.code] || { attended: 0, total: 0 };
              const percentage = getPercentage(course.code);
              const status = getStatus(percentage);
              const isAnimating = animatingCard === course.code;

              return (
                <div
                  key={course.code}
                  className={`course-card ${isAnimating ? `animating-${actionType}` : ''}`}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="course-header">
                    <div className="course-title-section">
                      <div
                        className="course-color-indicator"
                        style={{ backgroundColor: course.color }}
                      />
                      <div>
                        <h3 className="course-code">{course.code}</h3>
                        <p className="course-name">{course.name}</p>
                      </div>
                    </div>
                    <button
                      className="undo-button"
                      onClick={() => handleUndo(course.code)}
                      disabled={!data.total}
                      aria-label="Undo last action"
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 7v6h6" />
                        <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
                      </svg>
                    </button>
                  </div>

                  <div className="course-stats">
                    <div className="stats-row">
                      <span className="stat-text">
                        <strong>{data.attended}</strong> / {data.total} classes
                      </span>

                      <div className="status-right">
                        <span className={`status-label ${status.class}`}>
                          {status.label}
                        </span>
                        <span className={`mini-badge ${status.class}`}>
                          {percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="progress-container">
                      <div
                        className={`progress-bar ${status.class}`}
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: course.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="action-buttons">
                    <button
                      className="action-btn attended-btn"
                      onClick={() => handleAttended(course.code)}
                    >
                      <span className="btn-icon">✓</span>
                      <span className="btn-text">Attended</span>
                    </button>
                    <button
                      className="action-btn missed-btn"
                      onClick={() => handleMissed(course.code)}
                    >
                      <span className="btn-icon">✗</span>
                      <span className="btn-text">Missed</span>
                    </button>
                  </div>

                  {isAnimating && <div className={`ripple-effect ${actionType}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="footer-section">
          <button className="reset-button" onClick={resetAll}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            Reset All Data
          </button>
          <p className="footer-note">Data is saved automatically in your browser</p>
        </div>
      </div>

      {/* Glassmorphism session selector modal */}
      {sessionModal.open && (
        <div className="session-modal-backdrop" onClick={closeSessionModal}>
          <div
            className="session-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="session-modal-header">
              <h3>
                {sessionModal.mode === 'attended' ? 'Mark Attended' : 'Mark Missed'}
              </h3>
              <p>Select how many sessions to apply</p>
            </div>
            <div className="session-modal-buttons">
              {[1, 2, 4].map((count) => (
                <button
                  key={count}
                  className="session-count-button"
                  onClick={() => applySessionChange(count)}
                >
                  {count} session{count > 1 ? 's' : ''}
                </button>
              ))}
            </div>
            <button className="session-cancel-button" onClick={closeSessionModal}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
