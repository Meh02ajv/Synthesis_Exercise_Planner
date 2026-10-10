/* ============================================================
   app.js — Page-Specific Logic
   Loaded on ALL three pages after session.js.

   This file detects which page is currently loaded by checking
   for a unique element ID on each page's <body>, then runs
   only the relevant initialisation function.

   Pages:
     index.html   → initLoginPage()
     planner.html → initPlannerPage()
     routine.html → initRoutinePage()

   Chapters covered:
     Chapter 11: Form validation, input sanitization, boundary checks
     Chapter 13: DOM manipulation, event listeners, setInterval/clearInterval
     Chapter 14: Dynamic card generation, class switching, positioning
   ============================================================ */

'use strict';

/* ============================================================
   PAGE ROUTER
   Runs after the DOM is fully parsed.
   Checks for a unique marker element on each page and calls
   the matching init function — keeps all logic in one file
   while still being page-specific.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  if (document.getElementById('login-page-marker'))   initLoginPage();
  if (document.getElementById('planner-page-marker')) initPlannerPage();
  if (document.getElementById('routine-page-marker')) initRoutinePage();

});


/* ╔══════════════════════════════════════════════════════════╗
   ║  PAGE 1 — LOGIN (index.html)                            ║
   ╚══════════════════════════════════════════════════════════╝
   Handles:
     - Login form submission with JS validation
     - Writing loginName + loginTime into the session
     - Redirecting to planner.html on success
   ============================================================ */
function initLoginPage() {

  /* If already logged in, skip the login page entirely */
  if (isLoggedIn()) {
    window.location.href = 'planner.html';
    return;
  }

  const form      = document.getElementById('login-form');
  const nameInput = document.getElementById('login-name');
  const errEl     = document.getElementById('login-error');

  if (!form) return;

  /* ── Chapter 11: intercept form submit with preventDefault() ── */
  form.addEventListener('submit', e => {
    e.preventDefault(); // stop native browser submission

    /* Chapter 11: trim() removes leading/trailing whitespace */
    const name = nameInput.value.trim();

    /* Chapter 11: boundary check — name must be non-empty */
    if (!name || name.length < 2) {
      errEl.textContent = 'Please enter a name of at least 2 characters.';
      errEl.classList.add('visible');
      nameInput.classList.add('error');
      return;
    }

    /* Chapter 11: escHtml sanitizes the name before storing */
    workoutSession.loginName  = escHtml(name);
    workoutSession.loginTime  = Date.now(); // store as Unix ms timestamp
    workoutSession.exercises  = [];         // fresh routine on each login
    workoutSession.nextId     = 1;
    saveSession();

    /* Navigate to the planner page */
    window.location.href = 'planner.html';
  });

  /* Clear error styling as soon as the user starts typing */
  nameInput.addEventListener('input', () => {
    errEl.classList.remove('visible');
    nameInput.classList.remove('error');
  });
}


/* ╔══════════════════════════════════════════════════════════╗
   ║  PAGE 2 — PLANNER (planner.html)                        ║
   ╚══════════════════════════════════════════════════════════╝
   Handles:
     - Auth guard (redirect if not logged in)
     - Add Exercise form with full JS validation
     - Session Settings form
     - Live preview list of added exercises (right column)
     - Logout
   ============================================================ */
function initPlannerPage() {

  /* Chapter 12: auth guard — mirrors PHP header('Location:') redirect */
  requireLogin();

  /* Populate username in header */
  setEl('header-username', workoutSession.loginName);

  /* Start session clock in header */
  startSessionClock('session-clock');

  /* Render the initial preview list from any existing session data */
  renderPreviewList();

  /* Update exercise count badge */
  updateExerciseBadge();

  /* Bind the Add Exercise form */
  bindAddExerciseForm();

  /* Bind the Session Settings form */
  bindSettingsForm();

  /* Bind logout button */
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('End your session and return to the login page?')) {
        clearSession(); // Chapter 12: equivalent to session_destroy()
        window.location.href = 'index.html';
      }
    });
  }
}

/* ── Add Exercise Form (Chapter 11 & 13) ─────────────────── */
function bindAddExerciseForm() {
  const form = document.getElementById('add-exercise-form');
  if (!form) return;

  /* Chapter 13: addEventListener on form submit */
  form.addEventListener('submit', e => {
    e.preventDefault(); // Chapter 11: prevent default browser submission

    /* ── Gather raw input values ── */
    const muscle = form.muscle.value.trim();
    const name   = form.exercise_name.value.trim();
    const sets   = parseInt(form.sets.value, 10);
    const reps   = parseInt(form.reps.value, 10);

    /* Read the checked radio button value */
    const restRadio = form.querySelector('input[name="rest"]:checked');
    const rest      = restRadio ? parseInt(restRadio.value, 10) : workoutSession.settings.defaultRest;

    /* ── Chapter 11: client-side validation & boundary checks ── */
    let valid = true;

    /* Validate muscle group — must be one of the allowed values */
    const allowedMuscles = ['Chest', 'Back', 'Legs', 'Arms', 'Core'];
    if (!allowedMuscles.includes(muscle)) {
      showFieldError('err-muscle', 'Please select a muscle group.');
      valid = false;
    } else {
      clearFieldError('err-muscle');
    }

    /* Validate exercise name — non-empty, at least 2 characters */
    if (!name || name.length < 2) {
      showFieldError('err-name', 'Enter a valid exercise name (min 2 characters).');
      markInputError('exercise_name');
      valid = false;
    } else {
      clearFieldError('err-name');
      clearInputError('exercise_name');
    }

    /* Validate sets — positive integer, 1–20 */
    if (isNaN(sets) || sets < 1 || sets > 20) {
      showFieldError('err-sets', 'Sets must be between 1 and 20.');
      markInputError('sets');
      valid = false;
    } else {
      clearFieldError('err-sets');
      clearInputError('sets');
    }

    /* Validate reps — positive integer, 1–100 */
    if (isNaN(reps) || reps < 1 || reps > 100) {
      showFieldError('err-reps', 'Reps must be between 1 and 100.');
      markInputError('reps');
      valid = false;
    } else {
      clearFieldError('err-reps');
      clearInputError('reps');
    }

    /* Stop here if any field failed validation */
    if (!valid) {
      showToast('Please fix the highlighted fields.', 'warning');
      return;
    }

    /* ── Chapter 11: escHtml sanitizes name before storing ── */
    const exercise = addExercise({
      muscle,
      name:  escHtml(name), // sanitize user text input
      sets,
      reps,
      rest,
    });

    /* Reset form fields */
    form.reset();

    /* Restore default rest radio after reset */
    const defRadio = form.querySelector(`input[name="rest"][value="${workoutSession.settings.defaultRest}"]`);
    if (defRadio) defRadio.checked = true;

    /* Update the preview list and badge */
    renderPreviewList();
    updateExerciseBadge();

    showToast(`"${exercise.name}" added to your routine! 💪`, 'success');
  });

  /* Chapter 13: clear error styling on any input change */
  form.querySelectorAll('input, select').forEach(field => {
    field.addEventListener('input', () => {
      clearInputError(field.name || field.id);
    });
  });
}

/* ── Session Settings Form ───────────────────────────────── */
function bindSettingsForm() {
  const form = document.getElementById('settings-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const goal = parseInt(form.daily_goal.value, 10);
    const restRadio = form.querySelector('input[name="default_rest"]:checked');
    const rest = restRadio ? parseInt(restRadio.value, 10) : 60;

    /* Boundary check: goal must be 5–300 minutes */
    if (!isNaN(goal) && goal >= 5 && goal <= 300) {
      updateSettings({ dailyGoalMinutes: goal });
    }

    /* Validate rest is one of the allowed values */
    if ([30, 60, 90].includes(rest)) {
      updateSettings({ defaultRest: rest });
    }

    /* Refresh displayed settings values */
    refreshSettingsDisplay();
    showToast('Session settings saved! ✅', 'success');
  });

  /* Show current settings on load */
  refreshSettingsDisplay();
}

function refreshSettingsDisplay() {
  setEl('setting-goal', `${workoutSession.settings.dailyGoalMinutes} min`);
  setEl('setting-rest', `${workoutSession.settings.defaultRest}s`);
  setEl('setting-count', `${workoutSession.exercises.length} exercise(s)`);
}

/* ── Preview List (right column on planner.html) ─────────── */
function renderPreviewList() {
  const container = document.getElementById('preview-list');
  if (!container) return;

  const exercises = workoutSession.exercises;

  /* Show empty state if no exercises added yet */
  if (exercises.length === 0) {
    container.innerHTML = `
      <div class="preview-empty">
        <div class="preview-empty-icon">📋</div>
        <h3>No exercises added yet</h3>
        <p>Use the form on the left to build your routine.</p>
      </div>`;
    return;
  }

  /* Chapter 13: while loop iterates through exercises array */
  let html = '';
  let i = 0;
  while (i < exercises.length) {
    const ex  = exercises[i];
    const cfg = MUSCLE_CONFIG[ex.muscle] || { icon: '🏋️', previewCls: 'rgba(79,70,229,.15)' };

    html += `
      <div class="preview-item" id="preview-${ex.id}">
        <!-- Muscle icon -->
        <div class="preview-icon" style="background:${cfg.previewCls}">
          ${cfg.icon}
        </div>

        <!-- Exercise details -->
        <div style="flex:1; min-width:0;">
          <div class="preview-name">${escHtml(ex.name)}</div>
          <div class="preview-meta">
            ${escHtml(ex.muscle)} &nbsp;·&nbsp;
            ${ex.sets} sets × ${ex.reps} reps &nbsp;·&nbsp;
            ${ex.rest}s rest
          </div>
        </div>

        <!-- Remove button -->
        <button class="preview-remove"
                onclick="removePreviewItem(${ex.id})"
                title="Remove exercise">✕</button>
      </div>`;
    i++;
  }

  container.innerHTML = html;
}

/* Remove an exercise from the preview list */
function removePreviewItem(id) {
  /* Animate the item out before removing */
  const item = document.getElementById(`preview-${id}`);
  if (item) {
    item.style.transition = 'opacity .25s ease, transform .25s ease';
    item.style.opacity    = '0';
    item.style.transform  = 'translateX(10px)';
    setTimeout(() => {
      removeExercise(id); // update session state
      renderPreviewList();
      updateExerciseBadge();
    }, 270);
  }
}

/* Update the exercise count badge in the panel header */
function updateExerciseBadge() {
  setEl('exercise-count', workoutSession.exercises.length);
}

/* ── Field error helpers ─────────────────────────────────── */
function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}

function clearFieldError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = '';
  el.classList.remove('visible');
}

function markInputError(name) {
  const el = document.querySelector(`[name="${name}"]`);
  if (el) el.classList.add('error');
}

function clearInputError(name) {
  const el = document.querySelector(`[name="${name}"]`);
  if (el) el.classList.remove('error');
}


/* ╔══════════════════════════════════════════════════════════╗
   ║  PAGE 3 — ROUTINE (routine.html)                        ║
   ╚══════════════════════════════════════════════════════════╝
   Handles:
     - Auth guard
     - Stats bar population
     - Overall progress bar
     - Dynamic exercise card generation (Chapter 13 & 14)
     - "Complete Set" button → rest-stop timer (Chapter 13)
     - "Finish Exercise" → class switch to completed-card (Ch 14)
     - Filter tabs
     - Clear all
   ============================================================ */

/* Active timers store: { [exerciseId]: { interval, remaining } } */
const activeTimers = {};

/* Currently active muscle filter */
let activeFilter = 'All';

function initRoutinePage() {

  /* Chapter 12: auth guard */
  requireLogin();

  /* Populate username in header */
  setEl('header-username', workoutSession.loginName);

  /* Start session clock */
  startSessionClock('session-clock');

  /* Render stats, progress, and cards */
  refreshStats();
  refreshProgress();
  renderCards();

  /* Bind filter tabs */
  bindFilterTabs();

  /* Bind clear-all button */
  const clearBtn = document.getElementById('clear-all-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!workoutSession.exercises.length) {
        showToast('No exercises to clear.', 'info');
        return;
      }
      if (!confirm('Clear all exercises from your routine?')) return;

      /* Stop all running timers before clearing */
      Object.keys(activeTimers).forEach(id => {
        clearInterval(activeTimers[id].interval);
        delete activeTimers[id];
      });

      workoutSession.exercises = [];
      saveSession();

      renderCards();
      refreshStats();
      refreshProgress();
      showToast('Routine cleared. Start fresh! 💪', 'info');
    });
  }

  /* Bind logout */
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (confirm('End your session and return to the login page?')) {
        /* Stop all timers before logout */
        Object.keys(activeTimers).forEach(id => {
          clearInterval(activeTimers[id].interval);
        });
        clearSession();
        window.location.href = 'index.html';
      }
    });
  }
}

/* ── Stats Bar ───────────────────────────────────────────── */
function refreshStats() {
  const s = getStats(); // from session.js
  setEl('stat-total',     s.total);
  setEl('stat-completed', s.completed);
  setEl('stat-pending',   s.pending);
  setEl('stat-sets',      s.totalSets);
}

/* ── Overall Progress Bar ────────────────────────────────── */
function refreshProgress() {
  const s = getStats();

  /* Update percentage text */
  setEl('overview-pct', `${s.pct}%`);

  /* Chapter 13: DOM manipulation — update progress bar width */
  const fill = document.getElementById('big-bar-fill');
  if (fill) fill.style.width = `${s.pct}%`;

  setEl('overview-sub',  `${s.completed} of ${s.total} exercises complete`);
  setEl('overview-goal', `Goal: ${workoutSession.settings.dailyGoalMinutes} min session`);
  setEl('count-pill',    workoutSession.exercises.filter(
    e => activeFilter === 'All' || e.muscle === activeFilter
  ).length);
}

/* ── Filter Tabs ─────────────────────────────────────────── */
function bindFilterTabs() {
  /* Chapter 13: attach click event listener to each tab button */
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      /* Remove active class from all tabs */
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      /* Add active class to clicked tab */
      tab.classList.add('active');
      activeFilter = tab.dataset.filter;
      renderCards();
    });
  });
}

/* ── Render Exercise Cards (Chapter 13 & 14) ─────────────── */
function renderCards() {
  const grid = document.getElementById('cards-grid');
  if (!grid) return;

  /* Apply active filter */
  const list = activeFilter === 'All'
    ? workoutSession.exercises
    : workoutSession.exercises.filter(ex => ex.muscle === activeFilter);

  /* Clear the grid */
  grid.innerHTML = '';

  /* Show empty state if no exercises match */
  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏃</div>
        <h3>${workoutSession.exercises.length === 0
          ? 'No exercises in your routine'
          : `No ${activeFilter} exercises`}</h3>
        <p>${workoutSession.exercises.length === 0
          ? 'Go to the Planner page to add exercises first.'
          : 'Try selecting a different muscle group filter.'}</p>
      </div>`;
    refreshProgress();
    return;
  }

  /* Chapter 13: for loop iterates through exercise objects */
  for (let i = 0; i < list.length; i++) {
    const card = buildCard(list[i]);

    /* Chapter 13: appendChild adds each card to the DOM */
    grid.appendChild(card);

    /* Staggered entrance animation — each card fades in slightly later */
    ;(function(c, delay) {
      setTimeout(() => {
        c.style.opacity   = '1';
        c.style.transform = 'translateY(0)';
      }, delay);
    })(card, i * 60);
  }

  refreshProgress();
}

/* ── Build a Single Exercise Card (Chapter 13 & 14) ─────── */
function buildCard(ex) {
  const cfg      = MUSCLE_CONFIG[ex.muscle] || { icon: '🏋️', cls: 'mi-back' };
  const pct      = ex.sets > 0 ? Math.round((ex.setsDone / ex.sets) * 100) : 0;
  const badgeCls = ex.completed
    ? 'badge-completed'
    : (ex.setsDone > 0 ? 'badge-inprogress' : 'badge-pending');
  const badgeTxt = ex.completed
    ? '✓ Done'
    : (ex.setsDone > 0 ? '⚡ Active' : '⏳ Pending');

  /* Chapter 13: document.createElement — creates a new DOM element */
  const card = document.createElement('div');

  /* Chapter 14: .exercise-card class + .completed-card class switch */
  card.className = `exercise-card${ex.completed ? ' completed-card' : ''}`;
  card.id        = `card-${ex.id}`;

  /* Start invisible for entrance animation */
  card.style.opacity   = '0';
  card.style.transform = 'translateY(14px)';
  card.style.transition = 'opacity .35s ease, transform .35s ease, border-color .25s ease, box-shadow .25s ease';

  /* Chapter 13: innerHTML builds the card's internal HTML structure */
  card.innerHTML = `

    <!-- ── Status Badge ──────────────────────────────────────
         Chapter 14: position:absolute pins this badge to the
         top-right corner of the card (which has position:relative).
         The badge class is switched by JS when state changes.
    ──────────────────────────────────────────────────────── -->
    <span class="status-badge ${badgeCls}" id="badge-${ex.id}">
      ${badgeTxt}
    </span>

    <!-- ── Card Header ───────────────────────────────────────
         Chapter 18: linear-gradient background.
         Muscle icon is colour-coded per group.
    ──────────────────────────────────────────────────────── -->
    <div class="card-header" id="header-${ex.id}">
      <div class="muscle-icon ${cfg.cls}">${cfg.icon}</div>
      <div style="flex:1; min-width:0;">
        <div class="card-name">${escHtml(ex.name)}</div>
        <div class="card-muscle-tag">
          ${escHtml(ex.muscle)} &nbsp;·&nbsp; Added ${escHtml(ex.addedAt)}
        </div>
      </div>
    </div>

    <!-- ── Card Body ─────────────────────────────────────────
         Chapter 18: padding as part of the box model.
    ──────────────────────────────────────────────────────── -->
    <div class="card-body">

      <!-- Mini stats: Sets | Reps | Rest -->
      <div class="card-stats">
        <div class="card-stat">
          <div class="cs-value">${ex.sets}</div>
          <div class="cs-label">Sets</div>
        </div>
        <div class="card-stat">
          <div class="cs-value">${ex.reps}</div>
          <div class="cs-label">Reps</div>
        </div>
        <div class="card-stat">
          <div class="cs-value">${ex.rest}s</div>
          <div class="cs-label">Rest</div>
        </div>
      </div>

      <!-- Set progress bar -->
      <div class="progress-wrap">
        <div class="progress-head">
          <span>Sets Progress</span>
          <span id="prog-lbl-${ex.id}">${ex.setsDone}/${ex.sets}</span>
        </div>
        <div class="progress-bg">
          <!-- Chapter 18: gradient fill, width updated by JS -->
          <div class="progress-fill"
               id="prog-fill-${ex.id}"
               style="width:${pct}%">
          </div>
        </div>
      </div>

      <!-- Rest Timer Display
           Chapter 13: updated by setInterval every second.
           Chapter 18: transitions between default/active/done states. -->
      <div class="timer-display" id="timer-${ex.id}">
        <span>⏱ <span id="timer-txt-${ex.id}">Rest timer ready</span></span>
        <span class="timer-countdown" id="timer-cnt-${ex.id}"></span>
      </div>

      <!-- Action Buttons
           Chapter 13: onclick handlers call JS functions.
           Buttons are disabled once exercise is complete. -->
      <div class="card-actions">
        <button class="btn btn-accent"
                id="set-btn-${ex.id}"
                onclick="handleCompleteSet(${ex.id})"
                ${ex.completed ? 'disabled' : ''}>
          ✓ Set Done
        </button>
        <button class="btn btn-success"
                id="fin-btn-${ex.id}"
                onclick="handleFinishExercise(${ex.id})"
                ${ex.completed ? 'disabled' : ''}>
          🏆 Finish
        </button>
        <button class="btn btn-danger btn-sm"
                onclick="handleRemoveExercise(${ex.id})"
                title="Remove exercise">
          🗑
        </button>
      </div>

    </div>`;

  return card;
}


/* ── Complete Set Handler (Chapter 13) ───────────────────── */
function handleCompleteSet(id) {
  const ex = getExercise(id);
  if (!ex || ex.completed) return;

  /* Increment sets done */
  const newSetsDone = ex.setsDone + 1;
  updateExercise(id, { setsDone: newSetsDone });

  /* Chapter 13: DOM manipulation — update progress bar */
  const pct  = Math.min(Math.round((newSetsDone / ex.sets) * 100), 100);
  const fill = document.getElementById(`prog-fill-${id}`);
  const lbl  = document.getElementById(`prog-lbl-${id}`);
  if (fill) fill.style.width = `${pct}%`;
  if (lbl)  lbl.textContent  = `${newSetsDone}/${ex.sets}`;

  /* Update badge to "Active" */
  const badge = document.getElementById(`badge-${id}`);
  if (badge) {
    badge.className   = 'status-badge badge-inprogress';
    badge.textContent = '⚡ Active';
  }

  /* Auto-finish when all sets are done */
  if (newSetsDone >= ex.sets) {
    handleFinishExercise(id);
    return;
  }

  /* Start the rest-stop timer */
  startRestTimer(id, ex.rest);
  showToast(`Set ${newSetsDone}/${ex.sets} complete! Rest for ${ex.rest}s 💪`, 'success');
}


/* ── Rest-Stop Timer (Chapter 13: setInterval / clearInterval) ── */
function startRestTimer(id, seconds) {

  /* Clear any existing timer for this card first */
  if (activeTimers[id]) {
    clearInterval(activeTimers[id].interval); // Chapter 13: clearInterval
    delete activeTimers[id];
  }

  /* Get timer DOM elements */
  const timerEl = document.getElementById(`timer-${id}`);
  const txtEl   = document.getElementById(`timer-txt-${id}`);
  const cntEl   = document.getElementById(`timer-cnt-${id}`);
  const setBtn  = document.getElementById(`set-btn-${id}`);

  let remaining = seconds;

  /* Disable "Set Done" button while resting */
  if (setBtn) setBtn.disabled = true;

  /* Chapter 13: DOM manipulation — switch timer to active state */
  if (timerEl) {
    timerEl.classList.remove('timer-done');
    timerEl.classList.add('timer-active');
  }
  if (txtEl) txtEl.textContent = 'Resting…';
  if (cntEl) cntEl.textContent = fmtTime(remaining);

  /* Chapter 13: setInterval — fires every 1000ms (1 second) */
  activeTimers[id] = {
    remaining,
    total: seconds,
    interval: setInterval(() => {
      remaining--;
      activeTimers[id].remaining = remaining;

      /* Update countdown display */
      if (cntEl) cntEl.textContent = fmtTime(remaining);

      /* When timer reaches zero */
      if (remaining <= 0) {

        /* Chapter 13: clearInterval stops the countdown */
        clearInterval(activeTimers[id].interval);
        delete activeTimers[id];

        /* Chapter 13: DOM update — switch to "done" state */
        if (timerEl) {
          timerEl.classList.remove('timer-active');
          timerEl.classList.add('timer-done');
        }
        if (txtEl) txtEl.textContent = 'Rest complete!';
        if (cntEl) cntEl.textContent = '';

        /* Re-enable the "Set Done" button */
        if (setBtn) setBtn.disabled = false;

        /* Play audio chime to alert the user */
        playChime();

        /* Flash the card border green */
        flashCard(id);

        showToast('Rest complete — start your next set! 🔥', 'info');
      }
    }, 1000) // Chapter 13: 1000ms interval = 1 second tick
  };
}


/* ── Finish Exercise Handler (Chapter 14: class switching) ── */
function handleFinishExercise(id) {
  const ex = getExercise(id);
  if (!ex || ex.completed) return;

  /* Persist completed state */
  updateExercise(id, { completed: true, setsDone: ex.sets });

  /* Stop any running timer for this card */
  if (activeTimers[id]) {
    clearInterval(activeTimers[id].interval);
    delete activeTimers[id];
  }

  /* ── Chapter 14: class selector switch ──────────────────────
     Adding .completed-card to the card element changes its
     visual appearance — border colour, background gradient,
     and header gradient all update via CSS class rules.
  ──────────────────────────────────────────────────────────── */
  const card    = document.getElementById(`card-${id}`);
  const badge   = document.getElementById(`badge-${id}`);
  const header  = document.getElementById(`header-${id}`);
  const setBtn  = document.getElementById(`set-btn-${id}`);
  const finBtn  = document.getElementById(`fin-btn-${id}`);
  const fill    = document.getElementById(`prog-fill-${id}`);
  const lbl     = document.getElementById(`prog-lbl-${id}`);
  const timerEl = document.getElementById(`timer-${id}`);
  const txtEl   = document.getElementById(`timer-txt-${id}`);
  const cntEl   = document.getElementById(`timer-cnt-${id}`);

  /* Chapter 14: add .completed-card class — triggers CSS style switch */
  if (card)   card.classList.add('completed-card');

  /* Chapter 14: switch badge class from pending/inprogress → completed */
  if (badge) {
    badge.className   = 'status-badge badge-completed';
    badge.textContent = '✓ Done';
  }

  /* Update header gradient to green */
  if (header) {
    header.style.background =
      'linear-gradient(135deg, rgba(16,185,129,.22), rgba(16,185,129,.08))';
  }

  /* Disable action buttons */
  if (setBtn) setBtn.disabled = true;
  if (finBtn) finBtn.disabled = true;

  /* Fill progress bar to 100% */
  if (fill) fill.style.width = '100%';
  if (lbl)  lbl.textContent  = `${ex.sets}/${ex.sets}`;

  /* Update timer display to "complete" */
  if (timerEl) {
    timerEl.classList.remove('timer-active');
    timerEl.classList.add('timer-done');
  }
  if (txtEl) txtEl.textContent = 'Exercise complete!';
  if (cntEl) cntEl.textContent = '🏆';

  /* Refresh stats and progress bar */
  refreshStats();
  refreshProgress();

  showToast(`"${ex.name}" complete! Outstanding work! 🏆`, 'success');
}


/* ── Remove Exercise Handler ─────────────────────────────── */
function handleRemoveExercise(id) {
  if (!confirm('Remove this exercise from your routine?')) return;

  /* Stop timer if running */
  if (activeTimers[id]) {
    clearInterval(activeTimers[id].interval);
    delete activeTimers[id];
  }

  /* Animate card out before removing from DOM */
  const card = document.getElementById(`card-${id}`);
  if (card) {
    card.style.transition = 'opacity .28s ease, transform .28s ease';
    card.style.opacity    = '0';
    card.style.transform  = 'scale(.93)';

    setTimeout(() => {
      card.remove();           // remove from DOM
      removeExercise(id);      // remove from session state
      refreshStats();
      refreshProgress();

      /* Show empty state if no exercises remain */
      if (workoutSession.exercises.length === 0) renderCards();
    }, 300);
  }

  showToast('Exercise removed from routine.', 'info');
}


/* ── Audio Chime (Web Audio API) ─────────────────────────── */
function playChime() {
  /* Web Audio API — generates a C5-E5-G5 major chord chime */
  try {
    const ctx   = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 frequencies in Hz

    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type            = 'sine';
      osc.frequency.value = freq;

      /* Stagger each note by 0.18s for an arpeggio effect */
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.05);  // fade in
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55); // fade out

      osc.start(t);
      osc.stop(t + 0.6);
    });
  } catch (_) {
    /* Silently ignore if Web Audio API is unavailable */
  }
}


/* ── Card Flash Animation ────────────────────────────────── */
function flashCard(id) {
  /* Chapter 13: DOM manipulation — temporarily change box-shadow */
  const card = document.getElementById(`card-${id}`);
  if (!card) return;
  card.style.boxShadow = '0 0 0 3px #10b981, 0 8px 40px rgba(16,185,129,.4)';
  setTimeout(() => { card.style.boxShadow = ''; }, 1400);
}