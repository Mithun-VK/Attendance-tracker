import React, { useState, useEffect } from 'react';
import './App.css';

const COLOR_PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#10b981',
  '#f59e0b', '#06b6d4', '#ef4444', '#14b8a6',
  '#f97316', '#3b82f6', '#a855f7', '#84cc16',
];

const DEFAULT_COURSE_FORM = {
  code: '',
  name: '',
  sessionsPerWeek: 3,
  color: COLOR_PALETTE[0],
};

const App = () => {
  // ----- courses (now fully CRUD-able, no hardcoding) -----
  const [courses, setCourses] = useState(() => {
    const saved = localStorage.getItem('coursesData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // fall through
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('coursesData', JSON.stringify(courses));
  }, [courses]);

  // ----- attendance state -----
  const [attendance, setAttendance] = useState(() => {
    const saved = localStorage.getItem('attendanceData');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        // fall through
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('attendanceData', JSON.stringify(attendance));
  }, [attendance]);

  // keep attendance in sync with courses (add missing entries, drop orphaned ones)
  useEffect(() => {
    setAttendance(prev => {
      const next = {};
      courses.forEach(course => {
        const existing = prev[course.code];
        next[course.code] = {
          attended: Number(existing?.attended) || 0,
          total: Number(existing?.total) || 0,
        };
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses.map(c => c.code).join('|')]);

  // animation state
  const [animatingCard, setAnimatingCard] = useState(null);
  const [actionType, setActionType] = useState(null);

  // modals
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [sessionModal, setSessionModal] = useState({
    open: false,
    courseCode: null,
    mode: null, // 'attended' or 'missed'
  });

  // course CRUD modal: mode is 'add' | 'edit' | null
  const [courseModal, setCourseModal] = useState({
    open: false,
    mode: null,
    originalCode: null, // used to identify which course is being edited
    form: DEFAULT_COURSE_FORM,
  });
  const [courseFormError, setCourseFormError] = useState('');

  // delete confirmation modal
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    courseCode: null,
  });

  // ----- session modal handlers -----
  const openSessionModal = (courseCode, mode) => {
    setSessionModal({ open: true, courseCode, mode });
  };

  const closeSessionModal = () => {
    setSessionModal({ open: false, courseCode: null, mode: null });
  };

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
        return { ...prev, [courseCode]: { attended, total } };
      });
    } else if (mode === 'missed') {
      setAttendance(prev => {
        const prevData = prev[courseCode] || { attended: 0, total: 0 };
        const attended = Number(prevData.attended) || 0;
        const total = (Number(prevData.total) || 0) + count;
        return { ...prev, [courseCode]: { attended, total } };
      });
    }

    setTimeout(() => {
      setAnimatingCard(null);
      setActionType(null);
    }, 400);

    closeSessionModal();
  };

  const handleAttended = (courseCode) => openSessionModal(courseCode, 'attended');
  const handleMissed = (courseCode) => openSessionModal(courseCode, 'missed');

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

  // ----- reset modal handlers -----
  const openResetModal = () => setResetModalOpen(true);
  const closeResetModal = () => setResetModalOpen(false);

  const resetAll = () => {
    const initial = {};
    courses.forEach(course => {
      initial[course.code] = { attended: 0, total: 0 };
    });
    setAttendance(initial);
    closeResetModal();
  };

  // ----- course CRUD handlers -----
  const openAddCourseModal = () => {
    setCourseFormError('');
    setCourseModal({
      open: true,
      mode: 'add',
      originalCode: null,
      form: {
        ...DEFAULT_COURSE_FORM,
        color: COLOR_PALETTE[courses.length % COLOR_PALETTE.length],
      },
    });
  };

  const openEditCourseModal = (course) => {
    setCourseFormError('');
    setCourseModal({
      open: true,
      mode: 'edit',
      originalCode: course.code,
      form: { ...course },
    });
  };

  const closeCourseModal = () => {
    setCourseModal({ open: false, mode: null, originalCode: null, form: DEFAULT_COURSE_FORM });
    setCourseFormError('');
  };

  const updateCourseForm = (field, value) => {
    setCourseModal(prev => ({
      ...prev,
      form: { ...prev.form, [field]: value },
    }));
  };

  const saveCourse = () => {
    const { mode, originalCode, form } = courseModal;
    const code = (form.code || '').trim().toUpperCase();
    const name = (form.name || '').trim();
    const sessionsPerWeek = Number(form.sessionsPerWeek) || 1;
    const color = form.color || COLOR_PALETTE[0];

    if (!code || !name) {
      setCourseFormError('Course code and name are both required.');
      return;
    }
    if (sessionsPerWeek < 1) {
      setCourseFormError('Sessions per week must be at least 1.');
      return;
    }

    const duplicate = courses.some(c =>
      c.code === code && !(mode === 'edit' && c.code === originalCode)
    );
    if (duplicate) {
      setCourseFormError(`A subject with code "${code}" already exists.`);
      return;
    }

    if (mode === 'add') {
      setCourses(prev => [...prev, { code, name, sessionsPerWeek, color }]);
      setAttendance(prev => ({ ...prev, [code]: { attended: 0, total: 0 } }));
    } else if (mode === 'edit') {
      setCourses(prev =>
        prev.map(c => (c.code === originalCode ? { code, name, sessionsPerWeek, color } : c))
      );
      // if the code changed, migrate the attendance entry to the new key
      if (code !== originalCode) {
        setAttendance(prev => {
          const next = { ...prev };
          next[code] = next[originalCode] || { attended: 0, total: 0 };
          delete next[originalCode];
          return next;
        });
      }
    }

    closeCourseModal();
  };

  const openDeleteModal = (courseCode) => setDeleteModal({ open: true, courseCode });
  const closeDeleteModal = () => setDeleteModal({ open: false, courseCode: null });

  const confirmDeleteCourse = () => {
    const { courseCode } = deleteModal;
    if (!courseCode) return;
    setCourses(prev => prev.filter(c => c.code !== courseCode));
    setAttendance(prev => {
      const next = { ...prev };
      delete next[courseCode];
      return next;
    });
    closeDeleteModal();
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="course-count">{courses.length} courses</span>
              <button
                className="action-btn attended-btn"
                style={{ padding: '8px 16px' }}
                onClick={openAddCourseModal}
              >
                <span className="btn-icon">+</span>
                <span className="btn-text">Add Subject</span>
              </button>
            </div>
          </div>

          {courses.length === 0 ? (
            <div
              className="course-card"
              style={{ textAlign: 'center', padding: '40px 20px' }}
            >
              <p style={{ margin: '0 0 16px 0' }}>
                No subjects yet. Add your first subject to start tracking attendance.
              </p>
              <button className="action-btn attended-btn" onClick={openAddCourseModal}>
                <span className="btn-icon">+</span>
                <span className="btn-text">Add Subject</span>
              </button>
            </div>
          ) : (
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
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="undo-button"
                          onClick={() => openEditCourseModal(course)}
                          aria-label="Edit subject"
                          title="Edit subject"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="undo-button"
                          onClick={() => openDeleteModal(course.code)}
                          aria-label="Delete subject"
                          title="Delete subject"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" />
                          </svg>
                        </button>
                        <button
                          className="undo-button"
                          onClick={() => handleUndo(course.code)}
                          disabled={!data.total}
                          aria-label="Undo last action"
                          title="Undo last action"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 7v6h6" />
                            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
                          </svg>
                        </button>
                      </div>
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
          )}
        </div>

        {/* Footer */}
        <div className="footer-section">
          <button
            className="reset-button"
            onClick={openResetModal}
            disabled={courses.length === 0}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      {/* Reset confirmation modal */}
      {resetModalOpen && (
        <div className="session-modal-backdrop" onClick={closeResetModal}>
          <div className="session-modal reset-modal" onClick={(e) => e.stopPropagation()}>
            <div className="session-modal-header">
              <h3>Reset Attendance</h3>
              <p>This will clear attendance counts for all subjects (subjects themselves are kept).</p>
            </div>

            <div className="reset-modal-buttons">
              <button className="reset-confirm-button" onClick={resetAll}>
                Yes, reset everything
              </button>
              <button className="session-cancel-button" onClick={closeResetModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session count selector modal */}
      {sessionModal.open && (
        <div className="session-modal-backdrop" onClick={closeSessionModal}>
          <div className="session-modal" onClick={(e) => e.stopPropagation()}>
            <div className="session-modal-header">
              <h3>{sessionModal.mode === 'attended' ? 'Mark Attended' : 'Mark Missed'}</h3>
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

      {/* Add / Edit subject modal */}
      {courseModal.open && (
        <div className="session-modal-backdrop" onClick={closeCourseModal}>
          <div className="session-modal" onClick={(e) => e.stopPropagation()}>
            <div className="session-modal-header">
              <h3>{courseModal.mode === 'add' ? 'Add Subject' : 'Edit Subject'}</h3>
              <p>Fill in the subject details</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
                Course code
                <input
                  type="text"
                  value={courseModal.form.code}
                  onChange={(e) => updateCourseForm('code', e.target.value.toUpperCase())}
                  placeholder="e.g. CS23601"
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
                Course name
                <input
                  type="text"
                  value={courseModal.form.name}
                  onChange={(e) => updateCourseForm('name', e.target.value)}
                  placeholder="e.g. MACHINE LEARNING"
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
                Sessions per week
                <input
                  type="number"
                  min="1"
                  value={courseModal.form.sessionsPerWeek}
                  onChange={(e) => updateCourseForm('sessionsPerWeek', e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '14px' }}>
                Color
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateCourseForm('color', c)}
                      aria-label={`Select color ${c}`}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        border: courseModal.form.color === c ? '3px solid #111827' : '2px solid transparent',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </div>

              {courseFormError && (
                <p style={{ color: '#ef4444', fontSize: '13px', margin: 0 }}>{courseFormError}</p>
              )}
            </div>

            <div className="reset-modal-buttons">
              <button className="reset-confirm-button" onClick={saveCourse}>
                {courseModal.mode === 'add' ? 'Add subject' : 'Save changes'}
              </button>
              <button className="session-cancel-button" onClick={closeCourseModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal.open && (
        <div className="session-modal-backdrop" onClick={closeDeleteModal}>
          <div className="session-modal reset-modal" onClick={(e) => e.stopPropagation()}>
            <div className="session-modal-header">
              <h3>Delete Subject</h3>
              <p>
                This will permanently remove <strong>{deleteModal.courseCode}</strong> and its
                attendance history. This cannot be undone.
              </p>
            </div>

            <div className="reset-modal-buttons">
              <button className="reset-confirm-button" onClick={confirmDeleteCourse}>
                Yes, delete subject
              </button>
              <button className="session-cancel-button" onClick={closeDeleteModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;