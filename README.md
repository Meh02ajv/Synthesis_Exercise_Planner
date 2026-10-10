# 🏋️ Exercise Planner
### A 3-Page Client-Side Workout Routine Manager

---

## 📁 Project Structure

```
exercise_planner/
│
├── index.html          ← Page 1: Login / Welcome
├── planner.html        ← Page 2: Add Exercises + Session Settings
├── routine.html        ← Page 3: Live Routine + Cards + Timers
│
├── css/
│   └── style.css       ← Shared stylesheet (all 3 pages)
│
├── js/
│   ├── session.js      ← Shared session state + utility functions
│   └── app.js          ← Page-specific logic (router + 3 init functions)
│
└── README.md           ← This file
```

---

## 🚀 How to Run

### Option A — Local Server (Recommended)
1. Copy the `exercise_planner/` folder into your AMPPS / XAMPP / WAMP document root:
   - AMPPS: `C:/Program Files/Ampps/www/`
   - XAMPP: `C:/xampp/htdocs/`
   - WAMP:  `C:/wamp64/www/`
2. Start Apache from your stack manager.
3. Open your browser and navigate to:
   ```
   http://localhost/exercise_planner/index.html
   ```

### Option B — Direct File Open
Because this project is pure HTML/CSS/JavaScript with no server-side code,
you can also open `index.html` directly in any modern browser:
```
File → Open File → exercise_planner/index.html
```
> ⚠️ Some browsers restrict `localStorage` on `file://` URLs.
> Use Option A (local server) if the session does not persist between pages.

---

## 📄 The 3 Pages

### Page 1 — `index.html` (Login / Welcome)
- Collects the user's name via a validated text input.
- Writes `loginName` and `loginTime` into `localStorage` via `session.js`.
- Redirects to `planner.html` on successful login.
- If already logged in, skips directly to `planner.html`.
- **Chapter 11:** `<input type="text">` with JS validation (`e.preventDefault()`, min-length check, `escHtml()` sanitization).
- **Chapter 12:** Session initialisation — equivalent to PHP `session_start()` + `$_SESSION['username']`.

---

### Page 2 — `planner.html` (Add Exercise + Settings)
- **Left sidebar (sticky):** Add Exercise form + Session Settings form.
- **Right column:** Live preview list of all added exercises.
- Exercises are stored in `workoutSession.exercises[]` (localStorage) so they survive navigation to Page 3.
- **Chapter 11:** Full form with `<select>`, `<input type="text">`, `<input type="number">` (min/max/step), `<input type="radio">`. JS intercepts submit, validates all fields, sanitizes input.
- **Chapter 12:** Session persistence — `saveSession()` writes to `localStorage` after every change.
- **Chapter 13:** Preview list built with a `while` loop + `innerHTML`. Remove button wired to `removePreviewItem(id)`.
- **Chapter 14:** CSS Grid two-column layout. `position:sticky` sidebar.

---

### Page 3 — `routine.html` (Live Routine + Cards + Timers)
- Reads exercises from the session and dynamically builds exercise cards.
- Stats bar, overall progress bar, filter tabs, and card grid.
- Each card has a rest-stop countdown timer and set progress tracking.
- **Chapter 13:** Cards built with `document.createElement` + `appendChild` + `innerHTML`. `setInterval` / `clearInterval` for the rest timer. DOM color change when timer finishes. `onclick` event handlers on all buttons.
- **Chapter 14:** CSS Grid `auto-fill` card grid. `position:relative` on card, `position:absolute` on status badge. `.completed-card` class switch changes card styling.
- **Chapter 18:** `linear-gradient` on header, card headers, buttons, progress bars. `box-shadow` for depth. `transition` on hover, timer state, card completion.

---

## 🧩 JavaScript Architecture

### `js/session.js` — Shared Session Layer
Loaded on all 3 pages. Manages the single source of truth.

| Function | Purpose |
|---|---|
| `loadSession()` | Reads + parses `localStorage` on page load |
| `saveSession()` | Serialises `workoutSession` to `localStorage` |
| `clearSession()` | Destroys session (logout) |
| `isLoggedIn()` | Auth check — returns `true` if `loginName` is set |
| `requireLogin()` | Auth guard — redirects to `index.html` if not logged in |
| `addExercise(obj)` | Pushes exercise into array, assigns auto-increment ID |
| `removeExercise(id)` | Filters exercise out of array |
| `updateExercise(id, changes)` | Merges partial update into exercise object |
| `getExercise(id)` | Returns exercise by ID |
| `updateSettings(changes)` | Merges settings update |
| `getStats()` | Computes total / completed / pending / sets / pct |
| `escHtml(str)` | XSS sanitization (mirrors PHP `htmlspecialchars()`) |
| `showToast(msg, type)` | Appends self-dismissing toast notification |
| `setEl(id, val)` | Safe `textContent` setter by element ID |
| `fmtTime(s)` | Formats seconds → `"1:30"` or `"45s"` |
| `startSessionClock(id)` | Live `"Session: Xm XXs"` counter in header |

---

### `js/app.js` — Page-Specific Logic
Loaded on all 3 pages after `session.js`. Uses a **page router** pattern:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('login-page-marker'))   initLoginPage();
  if (document.getElementById('planner-page-marker')) initPlannerPage();
  if (document.getElementById('routine-page-marker')) initRoutinePage();
});
```

Each HTML page contains a hidden `<div id="[page]-page-marker">` element.
`app.js` detects which page is loaded and runs only the relevant function.

---

## 📚 Chapter Coverage

### Chapter 11 — Form Handling & Input Sanitization
| Technique | Where Used |
|---|---|
| `<select>` dropdown | Muscle group picker on `planner.html` |
| `<input type="text">` | Exercise name + login name |
| `<input type="number">` with `min`, `max`, `step` | Sets (1–20) and Reps (1–100) |
| `<input type="radio">` | Rest interval (30s / 60s / 90s) |
| `e.preventDefault()` | All form submit handlers in `app.js` |
| Boundary checks | `isNaN()`, range validation on all numeric fields |
| `escHtml()` sanitization | Applied to all user text before storing |
| Inline field errors | `.field-error` elements shown/hidden by JS |

---

### Chapter 12 — Session Persistence
| Technique | Where Used |
|---|---|
| `localStorage.setItem()` | `saveSession()` — persists after every change |
| `localStorage.getItem()` | `loadSession()` — restores on every page load |
| `localStorage.removeItem()` | `clearSession()` — called on logout |
| Auth guard | `requireLogin()` — redirects if `loginName` not set |
| Session object | `workoutSession` — mirrors PHP `$_SESSION` structure |
| Login time | `workoutSession.loginTime` — used by session clock |

---

### Chapter 13 — DOM Manipulation & Event Listeners
| Technique | Where Used |
|---|---|
| `document.createElement()` | `buildCard()` creates each exercise card element |
| `appendChild()` | `renderCards()` adds each card to `#cards-grid` |
| `innerHTML` | Card internal HTML structure, preview list items |
| `for` loop | `renderCards()` iterates `workoutSession.exercises` |
| `while` loop | `renderPreviewList()` iterates exercises |
| `addEventListener('submit')` | All form handlers |
| `addEventListener('click')` | Filter tabs, logout, clear-all buttons |
| `onclick` attributes | Card action buttons (Set Done, Finish, Remove) |
| `setInterval()` | Rest timer countdown — fires every 1000ms |
| `clearInterval()` | Stops timer when rest is complete or exercise removed |
| DOM color change | Timer display switches `.timer-active` / `.timer-done` class |
| `textContent` updates | Stats bar, progress %, timer countdown, progress label |
| `style.width` updates | Progress bar fill percentage |

---

### Chapter 14 — Layout & Positioning
| Technique | Where Used |
|---|---|
| `display: flex` | Header nav, logo, button groups, feature lists |
| `display: grid` | App layouts, stats bar, cards grid, form rows |
| `grid-template-columns: repeat(auto-fill, minmax(290px, 1fr))` | Cards grid — responsive auto-wrap |
| `position: sticky` | Site header, planner sidebar |
| `position: relative` | `.exercise-card` — anchors the absolute badge |
| `position: absolute` | `.status-badge` — pinned to `top:13px; right:13px` |
| `.completed-card` class | Added by JS to switch card styling on completion |
| `.badge-pending` / `.badge-inprogress` / `.badge-completed` | Class switched by JS |
| `z-index` | Badge sits above card header content |

---

### Chapter 18 — CSS Box Model & Visual Styling
| Technique | Where Used |
|---|---|
| `box-sizing: border-box` | Applied globally via `*` selector |
| `padding` | All cards, panels, buttons, inputs, stats |
| `margin` | Form groups, section spacing, card gaps |
| `border` | All cards, inputs, panels, badges |
| `linear-gradient` | Header bg, card headers, buttons, progress bars, logo |
| `radial-gradient` | Login page background ambient glow |
| `box-shadow` | Cards, panels, buttons, logo icon, login card |
| `transition: all .25s ease` | Hover states, timer activation, card completion |
| `border-radius` | All rounded corners (sm/md/lg/xl variants) |
| `transform: translateY(-3px)` | Card hover lift effect |
| `opacity` | Card entrance animation, disabled states |

---

## 🎨 Design System

### Colour Palette
| Token | Value | Usage |
|---|---|---|
| `--primary` | `#4f46e5` | Buttons, focus rings, active states |
| `--accent` | `#06b6d4` | Secondary actions, progress bars |
| `--success` | `#10b981` | Completed states, finish button |
| `--warning` | `#f59e0b` | Pending badge |
| `--danger` | `#ef4444` | Remove button, error states |
| `--bg-dark` | `#0f172a` | Page background |
| `--bg-card` | `#1e293b` | Card / panel surfaces |

### Typography
- Font: `'Segoe UI'`, `system-ui`, `-apple-system`, `sans-serif`
- Base size: `15px`
- Scale: `.68rem` (micro labels) → `2.1rem` (progress percentage)

---

## 🔒 Security Notes
- All user text input is sanitized with `escHtml()` before being inserted into the DOM via `innerHTML`, preventing XSS injection.
- No data is sent to any server — everything stays in the browser's `localStorage`.
- The auth guard (`requireLogin()`) prevents access to `planner.html` and `routine.html` without a session.

---

## 🌐 Browser Compatibility
| Feature | Support |
|---|---|
| `localStorage` | All modern browsers |
| CSS Grid / Flexbox | All modern browsers |
| Web Audio API (chime) | Chrome, Firefox, Safari, Edge |
| CSS Custom Properties | All modern browsers |
| `structuredClone()` | Chrome 98+, Firefox 94+, Safari 15.4+ |

> For older browser support, replace `structuredClone()` in `session.js` with `JSON.parse(JSON.stringify(...))`.

---

*Exercise Planner — Pure HTML / CSS / JavaScript · No server required · Chapters 11 · 12 · 13 · 14 · 18*