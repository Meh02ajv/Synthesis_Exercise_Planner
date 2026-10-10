/* ============================================================
   session.js — Shared Session State & Utilities
   Loaded on ALL three pages (index.html, planner.html, routine.html)

   Responsibility:
     - Holds the single source of truth: workoutSession object
     - Reads/writes to localStorage so data persists across pages
     - Exposes helper functions used by app.js on every page

   Chapter 12: Session persistence using localStorage
               (mirrors PHP $_SESSION behaviour in a pure JS app)
   ============================================================ */

'use strict';

/* ============================================================
   1. STORAGE KEY
   All session data is stored under this single localStorage key.
   ============================================================ */
const STORAGE_KEY = 'exercisePlannerSession';


/* ============================================================
   2. DEFAULT SESSION STRUCTURE
   Mirrors the multidimensional PHP $_SESSION array described
   in Chapter 12. Contains:
     - exercises  : array of exercise objects (the "routine")
     - nextId     : auto-increment counter for unique IDs
     - settings   : user-configured session options
     - loginName  : username entered on the login page
     - loginTime  : timestamp of session start (Unix ms)
   ============================================================ */
const DEFAULT_SESSION = {
  exercises:  [],       // multidimensional array — each item is an exercise object
  nextId:     1,        // increments each time an exercise is added
  settings: {
    dailyGoalMinutes: 45,   // target session duration
    defaultRest:      60,   // default rest interval in seconds
  },
  loginName:  '',
  loginTime:  null,
};


/* ============================================================
   3. workoutSession — LIVE SESSION OBJECT
   This is the in-memory state for the current page.
   It is loaded from localStorage on page load and saved back
   to localStorage whenever it changes.
   ============================================================ */
let workoutSession = loadSession();


/* ============================================================
   4. loadSession()
   Reads the stored JSON from localStorage and parses it.
   Falls back to DEFAULT_SESSION if nothing is stored yet
   or if the stored data is corrupted/unparseable.

   Chapter 12: equivalent to session_start() + reading $_SESSION
   ============================================================ */
function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SESSION);

    const parsed = JSON.parse(raw);

    // Merge with defaults so new fields added in future versions
    // don't break existing stored sessions
    return {
      ...structuredClone(DEFAULT_SESSION),
      ...parsed,
      settings: {
        ...DEFAULT_SESSION.settings,
        ...(parsed.settings || {}),
      },
    };
  } catch (e) {
    // If JSON.parse fails (corrupted data), start fresh
    console.warn('[session.js] Could not parse stored session — resetting.', e);
    return structuredClone(DEFAULT_SESSION);
  }
}


/* ============================================================
   5. saveSession()
   Serialises workoutSession to JSON and writes it to
   localStorage so it survives page navigation.

   Chapter 12: equivalent to PHP automatically persisting
               $_SESSION between requests.
   ============================================================ */
function saveSession() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workoutSession));
  } catch (e) {
    console.error('[session.js] Failed to save session to localStorage.', e);
  }
}


/* ============================================================
   6. clearSession()
   Destroys the stored session — equivalent to PHP's
   session_destroy(). Called on logout.
   ============================================================ */
function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  workoutSession = structuredClone(DEFAULT_SESSION);
}


/* ============================================================
   7. isLoggedIn()
   Returns true if a loginName has been set in the session.
   Used as an auth guard on planner.html and routine.html —
   redirects to index.html if not logged in.

   Chapter 12: mirrors the PHP isset($_SESSION['username']) check.
   ============================================================ */
function isLoggedIn() {
  return Boolean(workoutSession.loginName);
}


/* ============================================================
   8. requireLogin()
   Auth guard — call at the top of any protected page.
   Redirects to index.html if the user is not logged in.
   ============================================================ */
function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = 'index.html';
  }
}


/* ============================================================
   9. addExercise(exerciseObj)
   Pushes a new exercise into the session's exercises array
   and assigns it a unique auto-incremented ID.

   Chapter 12: equivalent to pushing into $_SESSION['workout_routine']
   ============================================================ */
function addExercise(exerciseObj) {
  const exercise = {
    ...exerciseObj,
    id:       workoutSession.nextId++,  // assign and increment
    setsDone: 0,
    completed: false,
    addedAt:  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
  workoutSession.exercises.push(exercise);
  saveSession(); // persist immediately
  return exercise;
}


/* ============================================================
   10. removeExercise(id)
   Filters the exercise with the given ID out of the array.
   ============================================================ */
function removeExercise(id) {
  workoutSession.exercises = workoutSession.exercises.filter(e => e.id !== id);
  saveSession();
}


/* ============================================================
   11. updateExercise(id, changes)
   Merges a partial update object into the matching exercise.
   Used by routine.js to update setsDone, completed, etc.
   ============================================================ */
function updateExercise(id, changes) {
  const idx = workoutSession.exercises.findIndex(e => e.id === id);
  if (idx === -1) return;
  workoutSession.exercises[idx] = { ...workoutSession.exercises[idx], ...changes };
  saveSession();
}


/* ============================================================
   12. getExercise(id)
   Returns the exercise object with the given ID, or null.
   ============================================================ */
function getExercise(id) {
  return workoutSession.exercises.find(e => e.id === id) || null;
}


/* ============================================================
   13. updateSettings(changes)
   Merges partial settings update and persists.
   ============================================================ */
function updateSettings(changes) {
  workoutSession.settings = { ...workoutSession.settings, ...changes };
  saveSession();
}


/* ============================================================
   14. getStats()
   Computes summary statistics from the exercises array.
   Used by routine.html to populate the stats bar.
   ============================================================ */
function getStats() {
  const exs       = workoutSession.exercises;
  const total     = exs.length;
  const completed = exs.filter(e => e.completed).length;
  const pending   = total - completed;
  const totalSets = exs.reduce((sum, e) => sum + (parseInt(e.sets, 10) || 0), 0);
  const pct       = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, completed, pending, totalSets, pct };
}


/* ============================================================
   15. SHARED UTILITY — escHtml(str)
   Escapes HTML special characters to prevent XSS when
   inserting user-supplied strings into the DOM via innerHTML.

   Chapter 11: mirrors PHP htmlspecialchars() sanitization.
   ============================================================ */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/* ============================================================
   16. SHARED UTILITY — showToast(message, type)
   Appends a self-dismissing toast notification to the
   #toast-container element present on every page.

   Types: 'success' | 'info' | 'warning' | 'danger'
   ============================================================ */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Icon map for each toast type
  const icons = { success: '✅', info: 'ℹ️', warning: '⚠️', danger: '❌' };

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast t-${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  // Auto-dismiss after 3.6 seconds with slide-out animation
  setTimeout(() => {
    toast.style.animation = 'toastOut .32s ease forwards';
    setTimeout(() => toast.remove(), 340);
  }, 3600);
}


/* ============================================================
   17. SHARED UTILITY — setEl(id, value)
   Safely sets the textContent of an element by ID.
   Avoids repeated null checks throughout page scripts.
   ============================================================ */
function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}


/* ============================================================
   18. SHARED UTILITY — fmtTime(seconds)
   Formats a number of seconds into a human-readable string.
   Used by the rest timer countdown display.
   Examples: 90 → "1:30"  |  45 → "45s"
   ============================================================ */
function fmtTime(s) {
  if (s <= 0) return '0s';
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${s}s`;
}


/* ============================================================
   19. SHARED UTILITY — startSessionClock(elementId)
   Displays a live "Session: Xm XXs" counter in the header.
   Starts counting from the stored loginTime.
   ============================================================ */
function startSessionClock(elementId) {
  const el    = document.getElementById(elementId);
  if (!el || !workoutSession.loginTime) return;

  const start = workoutSession.loginTime; // stored as Date.now() ms value

  function tick() {
    const diff = Math.floor((Date.now() - start) / 1000);
    const m    = Math.floor(diff / 60);
    const s    = diff % 60;
    el.textContent = `Session: ${m}m ${String(s).padStart(2, '0')}s`;
  }

  tick();
  setInterval(tick, 1000);
}


/* ============================================================
   20. MUSCLE GROUP CONFIG
   Shared lookup table mapping muscle group names to their
   display emoji and CSS class. Used when building cards
   on routine.html and preview items on planner.html.
   ============================================================ */
const MUSCLE_CONFIG = {
  Chest: { icon: '🫁', cls: 'mi-chest', previewCls: 'rgba(239,68,68,.15)'  },
  Back:  { icon: '🏋️', cls: 'mi-back',  previewCls: 'rgba(79,70,229,.15)'  },
  Legs:  { icon: '🦵', cls: 'mi-legs',  previewCls: 'rgba(16,185,129,.15)' },
  Arms:  { icon: '💪', cls: 'mi-arms',  previewCls: 'rgba(245,158,11,.15)' },
  Core:  { icon: '🔥', cls: 'mi-core',  previewCls: 'rgba(6,182,212,.15)'  },
};