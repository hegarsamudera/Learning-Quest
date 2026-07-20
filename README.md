# Learning Quest 🌟

A Math, Science, Coding, Reading, Social Studies and Arts adventure for kids
ages 5–7. Fully client-side, works offline, installable as a PWA.

This is a ground-up modular rewrite of the original single-file (~1.7MB)
`index.html` prototype. All 49 games, all gamification (coins, streaks,
pet evolution, achievements), and all visuals (aurora background, glass
cards, particle bursts, the crystal Adventure Trail) are preserved — see
**"What changed"** below for the full list of bugs fixed and the honest
scope of this pass.

---

## Setup

No build step, no dependencies. Any static file server works:

```bash
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000` (or whatever port your server prints).
Because this app fetches `data/*.json` with `fetch()`, opening
`index.html` directly via `file://` will **not** work in most browsers —
you need a local server (even a trivial one) for the lazy data loading
and the service worker to function.

---

## Architecture overview

```
index.html          Shell only — critical CSS inline, links everything else
manifest.json        PWA manifest (icons, theme, standalone display)
sw.js                 Service worker — cache-first shell, stale-while-revalidate data

css/
  tokens.css          Design tokens (colors, radii, shadows, fonts)
  base.css            Reset, app shell, screen-transition keyframes
  components.css      Buttons, cards, numpad, modals, pet companion, toasts
  screens.css          Home/Difficulty/Play/Complete/Pet/Trophy/Report layout,
                       + the Adventure Trail / Journey Map
  games/math.css       Visual mechanics: place value blocks, clock, fractions...
  games/coding.css     Robot grid, direction pad, sequence/loop chips
  games/science.css    Shared "quiz card" mechanics (multi-choice, sort, patterns)
  utilities.css        @keyframes library, reduced-motion, small-screen overrides

js/
  main.js             Entry point — boots router + renderer, registers sw.js
  state.js             Central store: { screen, currentGame, score, progress,
                       achievements, pet, settings, history }
  router.js            navigate()/replaceScreen() — drives store.screen,
                       syncs browser Back button, uses View Transitions API
  renderer.js           Swaps the mounted screen instance when store.screen
                       changes; owns the error boundary
  storage.js            localStorage wrapper with schema versioning
  dataLoader.js         Lazy fetch: games.json up front, data/<subject>.json
                       on demand, cached in memory + IndexedDB
  audio.js              Voice (speech synthesis) + SFX (Web Audio chimes)
  gamification.js       Coins, streak, achievements, the Sparkle pet economy
  installPrompt.js      "Add to Home Screen" capture + trigger (beforeinstallprompt)
  notifications.js      Re-engagement system: permission strategy, daily
                       reward, welcome-back, living-world, idle nudges,
                       install celebration — see its own section below
  utils.js               escapeHTML, shuffleArray, debounce, throttle, etc.

  components/           Reusable UI: Numpad, ProgressBar, CoinDisplay,
                       PetCompanion, Toast (+ showBanner), Modal, SparkleBubble
  screens/               HomeScreen, DifficultyScreen, PlayScreen,
                       CompleteScreen, PetScreen, TrophyScreen, ReportScreen
  games/                 One engine class per game type, all extending
                       BaseGame (mount/unmount) — see below
```

### State management

`state.js` implements exactly the `createStore` pattern you'd expect —
`get()` / `set(patch|updater)` / `subscribe(fn)`, ~30 lines, no framework.
`renderer.js` subscribes and re-mounts the active screen whenever
`state.screen` changes; nothing else re-renders reactively (each screen
owns its own DOM subtree and rebuilds it on `mount()`, same as the
original app — there's no need for a virtual-DOM diff on a page this
size, so `renderer.js`'s job is lifecycle management: unmount the
outgoing screen so its listeners/timers are cleaned up, mount the new
one, wrap it in an error boundary).

### The game-engine registry

Every game extends `BaseGame` (`mount(stageEl, question, ctx)` /
`unmount()`). `js/games/index.js` maps a game's `type` (from
`games.json`) to its engine class. This mirrors a pattern the *original*
monolith already used internally (a `RENDERERS[type].mount(...)` object
registry) — formalizing it as real classes was mostly mechanical because
that interface already existed, which is what made porting 23 distinct
interactive mechanics (numpad entry, robot grid, drag-to-sort, logic
gates, clock/fraction SVGs, function calls...) tractable in one pass
without introducing new bugs.

27 of the 49 games (all of Science, English, Social Studies and Arts)
share one multiple-choice mechanic — they all have `type: "scienceQuiz"`
in `games.json` regardless of subject. Rather than duplicate that engine
27 times, `QuizGame.js` holds the real implementation, and each named
topic (`SightWords.js`, `Phonics.js`, `WorldContinents.js`, ...) is a
one-line subclass — see "How to add a new game type" below for why that
shape was chosen over either 27 full copies or zero named files.

---

## How to add a new game type

1. **Create the engine.** Add `js/games/YourGame.js`:
   ```js
   import { BaseGame } from './BaseGame.js';

   export class YourGame extends BaseGame {
     mount(stage, question, ctx) {
       ctx.correctAnswer = question.answer;      // shown if the kid runs out of retries
       ctx.hintText = 'A hint shown after the first miss';
       stage.innerHTML = `<div class="eq-card">...</div>`;
       stage.querySelector('#checkBtn').addEventListener('click', () => {
         ctx.onCheck(/* boolean */ true);
       }, { signal: this.signal });          // `this.signal` auto-cleans on unmount()
     }
   }
   ```
   - Use `ctx.onCheck(isCorrect)` to report the result — PlayScreen owns
     retries, the coin multiplier, streaks and achievements; you don't
     re-implement any of that.
   - Set `ctx.selfManaged = true` if your engine wants to handle its own
     wrong-answer UI (like QuizGame does) instead of the generic
     retry/reveal flow.
   - If you use `setTimeout`, push the id into an array and clear it all
     in an overridden `unmount()` (see `CodeTheRobot.js` for the pattern)
     — don't leave timers running after the kid navigates away.
   - Numeric-entry games should use the shared `Numpad` component
     (`js/components/Numpad.js`) instead of hand-rolling a keypad.

2. **Register it.** Add one line to `TYPE_REGISTRY` in `js/games/index.js`.

3. **Add CSS.** Put its visual styling in the most relevant
   `css/games/*.css` file (or create a new one and link it from
   `index.html` + list it in `sw.js`'s `APP_SHELL`).

4. **Add questions and metadata** — see below.

---

## How to add new questions / a new game entry

1. Pick (or create) the right subject file in `data/` — `math.json`,
   `science.json`, `english.json`, `social.json`, `arts.json`, or
   `coding.json`. Add your game's key with an array of question objects:
   ```json
   { "yourGameKey": [ { "id": "yg-1", "difficulty": "easy", "...": "..." } ] }
   ```
   Give every question a globally-unique `id` — the original monolith
   shipped with a duplicate-ID bug (`missingNumber` and `musicalNotes`
   both used `mn-1..mn-18`) that's fixed in this data, so keep IDs
   prefixed per-game to avoid reintroducing it.
2. Add an entry to `data/games.json`'s `games` array:
   ```json
   { "key": "yourGameKey", "label": "Your Game", "icon": "🎯", "accent": "teal",
     "type": "yourGame", "subject": "math", "description": "...", "questionCount": 10 }
   ```
   `subject` must match the filename (without `.json`) you put the
   questions in — that's what `dataLoader.js` fetches on demand.
3. If it's a brand-new mechanic, follow "How to add a new game type"
   above; if it reuses an existing `type`, no JS changes are needed.

---

## What changed from the original monolith

**Critical bugs fixed** (see `data/` — verified programmatically, not just
by inspection):
- `musicalNotes` question IDs (`mn-1..mn-18`) collided with
  `missingNumber`'s. Renumbered to `mus-1..mus-18`.
- `multiplication.questions` was `{ easy:[], medium:[], hard:[] }`
  instead of a flat array. Flattened, with a `difficulty` field added to
  every question so the engine's existing tier-filtering logic works.
- The CSS had a byte-for-byte duplicate `.subject-folder-grid`/
  `.subject-folder` rule block, and three separate
  `@media (max-height:700px){...}` blocks scattered through the file.
  The duplicate rule was removed and all three media blocks were merged
  into one in `utilities.css`.

**Honest scope note:** the 23 game engines and all core
infrastructure (state/router/storage/audio/gamification/renderer) are
full, faithful ports of the original's tested logic — not
reimplementations from scratch — specifically to avoid introducing new
bugs during a rewrite this large. `CompleteScreen`, `PetScreen`,
`TrophyScreen` and `ReportScreen` are functionally complete but were
rebuilt more concisely than the original's markup rather than ported
line-for-line; if you spot a visual detail from the original that's
missing on one of those four screens, it's a good first PR.

---

## Browser support

| Browser | Minimum version | Notes |
|---|---|---|
| Chrome / Edge | 90+ | Full support, including View Transitions on 111+ |
| Firefox | 90+ | Full support (falls back to CSS transitions — no View Transitions API yet) |
| Safari (macOS) | 15+ | Full support |
| Safari (iOS) | 15+ | Full support; haptics via Vibration API are not available (Apple doesn't expose it to Safari) |
| Chrome Android | current | Full support |

Below these versions, an "please update your browser" banner is shown
(see `main.js`'s feature-detect for `fetch`/`Promise`/`customElements`)
instead of a blank or broken page.

---

## Re-engagement system (v2.1)

`js/notifications.js` is the single gateway for everything that makes the
game feel alive between visits: the friendly permission pre-ask, Sparkle's
rotating reminder messages, the offline daily reward, welcome-back
detection, the "living world" catch-up simulation, in-session idle
nudges, and the install celebration. **Nothing else in the codebase calls
the Notification API directly** — every call site uses `Notifications.show()`,
`.schedule()`, `.requestPermission()`, etc., so the underlying delivery
mechanism can change (see "V4: Push" below) without touching a single
screen or game file.

### Browser support for Notifications

| Browser | `Notification` API | Notes |
|---|---|---|
| Chrome / Edge / Android | ✅ | Full support, including while the tab is backgrounded |
| Firefox | ✅ | Full support |
| Safari (macOS) | ✅ (16.4+) | Requires the site be installed/pinned in some macOS versions |
| Safari (iOS/iPadOS) | ⚠️ 16.4+, **installed PWAs only** | Safari refuses `Notification.requestPermission()` from a regular browser tab; it only works once the app is added to the Home Screen |
| Chrome/Firefox private/incognito | ⚠️ Inconsistent | Some browsers silently deny permission in private windows |

Everywhere the API is missing or denied, `Notifications.show()` **still
works** — it transparently falls back to an in-app Sparkle speech bubble,
a slim top banner, or a modal, chosen by the message's urgency. No caller
needs to branch on support; that's the whole point of routing everything
through this module.

### Why true offline *scheduled* notifications are impossible here

A `setTimeout` (which is all `Notifications.schedule()` has to work with
in a backend-free app) only exists while the tab/process is alive.
Closing the tab, force-quitting the browser, or the OS suspending a
backgrounded browser all silently cancel it — there is no way for a
static site with no server to "wake itself up" hours or days later to
show a notification. That capability specifically requires the **Push
API**: the browser registers a subscription with a push service (e.g.
Google's FCM endpoint for Chrome, Apple's APNs for Safari), a **server**
sends a message to that subscription, and the Service Worker's `push`
event — which the OS invokes even with every tab closed — displays it.

Given this project's constraint of staying fully client-side, that's not
achievable, and this codebase doesn't pretend otherwise. Instead:
- `Notifications.schedule(type, delay)` fires for real while the tab is
  open (idle nudges, "remind me in 10 minutes"-style features), which
  covers a real and common case.
- It also persists the intended fire time to `localStorage`. If the kid
  reopens the app *after* that time has passed (tab was closed in the
  meantime), `Notifications.init()` notices and fires it immediately as
  a "while you were away" catch-up instead of just losing it.
- The daily reward / welcome-back / living-world features don't rely on
  scheduling at all — they're computed retroactively from timestamps
  (`lastLogin`, `lastReward`, `lastPlay`) the moment the app reopens,
  which works perfectly offline because it needs no "wake-up" — the kid
  opening the app *is* the wake-up.

### V4: migrating to real push notifications

The seam is intentionally narrow. `js/notifications.js` currently has a
`LocalScheduler` class as its only "provider" — the piece that knows
*how* a notification's timing is realized. V4 would add a
`PushProvider` class implementing the same shape:

```js
class PushProvider {
  async schedule(type, delay, payload) {
    // POST to a small backend: "show `type` for this subscription at
    // Date.now() + delay". Returns a server-assigned id.
  }
  async cancel(id) { /* DELETE to the backend */ }
  async cancelAll() { /* DELETE all for this subscription */ }
}
```

...and `NotificationManager` would construct whichever provider is
appropriate (e.g. `new PushProvider()` when a subscription exists,
falling back to `LocalScheduler` otherwise) — nothing in `show()`,
`requestPermission()`, `isSupported()`, or any call site elsewhere in the
app changes. On the server side, this is a small integration:
**Firebase Cloud Messaging** (simplest — handles the subscription
lifecycle and cross-browser quirks for you) or raw **Web Push**
(`web-push` npm package + VAPID keys, no vendor lock-in, slightly more
setup). Either way, `sw.js` already has the receiving end wired up (see
its `push` and `notificationclick` listeners) — it's currently inert
because nothing ever subscribes or sends to it, but the shape is exactly
what a V4 backend would target.

### Delight bonus features included

Good morning/afternoon/evening greeting (local device time), a birthday
surprise (opt-in via a `birthday` storage key — no profile UI exists yet
to set it, so it's a documented no-op until one does), a weekend bonus,
Halloween/Christmas/Lunar New Year seasonal events (device date, no
timezone server needed), 7/30/100-day streak milestones with their own
achievements + coin rewards, and a Sparkle "personality" that shifts its
message tone from curious (early pet stages) to cheerful to joyful
(legendary stage) as the pet grows.
