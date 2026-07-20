/**
 * notifications.js — the Notification Manager.
 *
 * Public API (exactly what the rest of the app is allowed to call):
 *   Notifications.init()
 *   Notifications.requestPermission()
 *   Notifications.show(type, options)
 *   Notifications.schedule(type, delay, payload)
 *   Notifications.cancel(id)
 *   Notifications.cancelAll()
 *   Notifications.isSupported()
 *   Notifications.isGranted()
 *
 * Nothing else in the codebase calls `new Notification(...)` or
 * `Notification.requestPermission()` directly — everything (permission
 * strategy, message rotation, offline daily rewards, welcome-back
 * detection, the "living world" simulation, idle nudges, install
 * celebration) is owned by this module so it can all evolve together,
 * and so V4 can swap the delivery mechanism without touching call sites
 * anywhere else (see "Future Push Architecture" in README.md).
 *
 * ------------------------------------------------------------------
 * WHY THIS CAN'T BE "TRUE" SCHEDULED OFFLINE NOTIFICATIONS
 * ------------------------------------------------------------------
 * A `setTimeout` only exists while the page/tab is open — closing the
 * tab (or the OS killing a backgrounded browser) cancels it. There is
 * no offline API that lets a static, backend-free site wake itself up
 * later to show a notification. Real "comes back tomorrow even if the
 * app's been closed" notifications require a **push service**: the
 * browser holds a subscription, a server sends a message to that
 * subscription, and the Service Worker's `push` event (which the OS can
 * invoke even with the tab closed) displays it. That needs a backend —
 * which this project intentionally doesn't have.
 *
 * So `Notifications.schedule()` here is honest about what it actually
 * does: it fires while the tab is open (a real feature — idle nudges,
 * "come back in 10 minutes" reminders), AND it persists the intended
 * fire time to localStorage so that if the kid reopens the app *after*
 * the scheduled time has passed, `init()` shows it as a "while you were
 * away" catch-up message instead of silently dropping it. That's the
 * best a backend-free app can honestly do — see README.md for the full
 * explanation and the V4 Push migration path.
 * ------------------------------------------------------------------
 */
import { store } from './state.js';
import { storageGet, storageSet } from './storage.js';
import { escapeHTML, randomInt } from './utils.js';
import {
  getPet, getPetStage, addCoins, bumpPetHappiness, earnAchievement, ACHIEVEMENTS,
} from './gamification.js';
import { showToast, showBanner } from './components/Toast.js';
import { showModal } from './components/Modal.js';
import { showSparkleBubble } from './components/SparkleBubble.js';

// ============================================================
// Message pools — everything comes from Sparkle, never a plain
// "educational reminder". Grouped by personality tier so the tone
// evolves as the pet grows (bonus: "Sparkle personality system").
// ============================================================
const REMINDER_MESSAGES = {
  // Stages 1-2 (egg/baby): curious, a little shy
  curious: [
    "🐣 I've been waiting for you!",
    '🥚 I wonder what adventure is next...',
    "🍎 I'm hungry! Let's solve 5 questions.",
    '🧩 I found a new puzzle, come see!',
    '❓ Psst... I have a secret to show you.',
  ],
  // Stages 3-4 (adventurer/hero): warmer, more expressive
  cheerful: [
    '🎁 I found a treasure chest!',
    '🌟 You are so close to leveling up!',
    '🔥 Our streak is still alive!',
    '🎈 I miss going on adventures together!',
    '🗺️ I found a new path on the map!',
    '💪 Ready to be a hero again?',
  ],
  // Stage 5 (legendary): confident, proud, a little cheeky
  joyful: [
    '👑 Your legendary friend is bored without you!',
    '✨ I saved my best trick for when you got back!',
    "🎉 Let's go make today legendary!",
    '🌈 I have a rainbow-sized hello for you!',
    "🚀 I'm ready when you are, champion!",
  ],
};

const WELCOME_BACK_COPY = {
  1: { icon: '🐣', title: 'Sparkle missed you!', anim: 'pet-react-happy' },
  3: { icon: '😟', title: 'Sparkle was worried...', anim: 'pet-react-sad' },
  7: { icon: '🥳', title: 'Sparkle is SO HAPPY you\'re back!', anim: 'pet-react-excited' },
};

const SEASONAL_EVENTS = [
  { test: (d) => d.getMonth() === 9 && d.getDate() >= 24, icon: '🎃', text: 'Spooky surprises are appearing around the map!' },
  { test: (d) => d.getMonth() === 11 && d.getDate() >= 18, icon: '🎄', text: 'Snow is falling on every island!' },
  { test: (d) => (d.getMonth() === 0 && d.getDate() >= 20) || (d.getMonth() === 1 && d.getDate() <= 10), icon: '🧧', text: 'Lucky red envelopes are hidden in your games!' },
];

// ============================================================
// Persisted keys (all via storage.js, prefixed automatically)
// ============================================================
const KEYS = {
  permissionChoice: 'notif_permissionChoice',  // 'unset' | 'yes' | 'later' | 'no'
  lastPromptedAt: 'notif_lastPromptedAt',
  lastLogin: 'lastLogin',
  lastReward: 'lastReward',                     // dateKey string
  lastPlay: 'lastPlay',                         // timestamp
  lastPlayDateKey: 'notif_lastPlayDateKey',
  dailyStreak: 'notif_dailyStreak',
  streakMilestonesCelebrated: 'notif_streakMilestones',
  installCelebrationShown: 'notif_installCelebrationShown',
  lastMessageKey: 'notif_lastMessageKey',
  pendingScheduled: 'notif_pendingScheduled',    // { [id]: { type, fireAt, payload } }
};

const todayDateKey = (d = new Date()) => d.toDateString();
const daysBetween = (a, b) => Math.floor((b - a) / 86_400_000);

// ============================================================
// LocalScheduler — the "provider". This is the piece V4 replaces with
// a PushProvider (server-backed) without changing anything above the
// `Notifications` facade. Its contract: schedule(type, delay, payload)
// -> id; cancel(id); cancelAll(); plus it persists pending entries so
// a reopen can catch up on anything missed while the tab was closed.
// ============================================================
class LocalScheduler {
  #timeouts = new Map(); // id -> setTimeout handle
  #onFire;

  constructor(onFire) {
    this.#onFire = onFire;
  }

  #readPending() { return storageGet(KEYS.pendingScheduled, {}); }
  #writePending(map) { storageSet(KEYS.pendingScheduled, map); }

  schedule(type, delay, payload = {}) {
    const id = `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const fireAt = Date.now() + delay;
    const pending = this.#readPending();
    pending[id] = { type, fireAt, payload };
    this.#writePending(pending);

    const handle = setTimeout(() => this.#fire(id), delay);
    this.#timeouts.set(id, handle);
    return id;
  }

  #fire(id) {
    const pending = this.#readPending();
    const entry = pending[id];
    this.#timeouts.delete(id);
    if (!entry) return;
    delete pending[id];
    this.#writePending(pending);
    this.#onFire(entry.type, entry.payload, { late: false });
  }

  cancel(id) {
    const handle = this.#timeouts.get(id);
    if (handle) clearTimeout(handle);
    this.#timeouts.delete(id);
    const pending = this.#readPending();
    if (pending[id]) { delete pending[id]; this.#writePending(pending); }
  }

  cancelAll() {
    this.#timeouts.forEach((h) => clearTimeout(h));
    this.#timeouts.clear();
    this.#writePending({});
  }

  /** Called once at boot: re-arms timers for anything still in the
   *  future, and fires anything whose time already passed while the
   *  tab was closed (the best-effort "catch-up" — see module docblock). */
  resumePending() {
    const pending = this.#readPending();
    const now = Date.now();
    Object.entries(pending).forEach(([id, entry]) => {
      const remaining = entry.fireAt - now;
      if (remaining <= 0) {
        this.#onFire(entry.type, entry.payload, { late: true });
        delete pending[id];
      } else {
        const handle = setTimeout(() => this.#fire(id), remaining);
        this.#timeouts.set(id, handle);
      }
    });
    this.#writePending(pending);
  }
}

// ============================================================
// The Notification Manager itself
// ============================================================
class NotificationManager {
  #provider = new LocalScheduler((type, payload, meta) => this.show(type, { ...payload, _late: meta.late }));
  #idleTimeouts = [];
  #idleAbort = null;
  #initialized = false;

  // ---- capability checks ----------------------------------------
  isSupported() { return 'Notification' in window; }
  isGranted() { return this.isSupported() && Notification.permission === 'granted'; }

  // ---- boot ------------------------------------------------------
  async init() {
    if (this.#initialized) return;
    this.#initialized = true;

    this.#provider.resumePending();
    this.#armIdleWatcher();
    window.addEventListener('appinstalled', () => this.#celebrateInstall());

    // Everything below is a one-time-per-session "what happened while
    // you were away" pass, ordered from most to least exciting so we
    // don't stack five popups on top of each other.
    const previousLogin = storageGet(KEYS.lastLogin, null);
    const now = Date.now();
    storageSet(KEYS.lastLogin, now);

    if (previousLogin) {
      const gapDays = daysBetween(new Date(previousLogin), new Date(now));
      if (gapDays >= 1) {
        this.#showWelcomeBack(gapDays);
        this.#showLivingWorld(previousLogin, now);
      }
    }

    this.#checkDailyReward();
    this.#checkSeasonalEvent();
    this.#watchPermissionTriggers();
  }

  // ---- permission strategy ----------------------------------------
  /** Never call this directly to force the OS prompt — it's only meant
   *  to be invoked after the kid taps "Yes!" on the friendly pre-ask
   *  modal (see #watchPermissionTriggers / #maybeAskPermission below). */
  async requestPermission() {
    if (!this.isSupported()) return 'unsupported';
    const result = await Notification.requestPermission();
    storageSet(KEYS.permissionChoice, result === 'granted' ? 'yes' : 'no');
    return result;
  }

  /** Wires the store to watch for the "ask now" moments, without
   *  gamification.js needing to know notifications.js exists (avoids a
   *  circular import — we just observe state changes reactively). */
  #watchPermissionTriggers() {
    let prevHistoryLen = store.get().history.length;
    let prevTotalCoins = store.get().score.totalCoinsEarned;
    let prevStreak = store.get().score.streak;

    store.subscribe((state) => {
      if (state.history.length > prevHistoryLen && prevHistoryLen === 0) this.#maybeAskPermission('first-game');
      if (state.score.totalCoinsEarned > 0 && prevTotalCoins === 0) this.#maybeAskPermission('first-coins');
      if (state.score.streak >= 5 && prevStreak < 5) this.#maybeAskPermission('streak');
      prevHistoryLen = state.history.length;
      prevTotalCoins = state.score.totalCoinsEarned;
      prevStreak = state.score.streak;

      this.#trackDailyStreak(state);
    });
  }

  #maybeAskPermission(trigger) {
    const choice = storageGet(KEYS.permissionChoice, 'unset');
    if (choice === 'yes' || choice === 'no') return; // already decided, never ask again
    if (!this.isSupported() || this.isGranted()) return;

    // "Maybe Later" can be re-asked, but not more than once a day —
    // never annoy them.
    const lastPrompted = storageGet(KEYS.lastPromptedAt, 0);
    if (choice === 'later' && Date.now() - lastPrompted < 86_400_000) return;

    storageSet(KEYS.lastPromptedAt, Date.now());
    this.#showPreAskModal(trigger);
  }

  #showPreAskModal(trigger) {
    const pet = getPetStage(getPet());
    showModal({
      icon: '🔔',
      title: 'A message from Sparkle',
      body: `<p>Would you like <strong>Sparkle</strong> ${escapeHTML(pet.emoji)} to remind you about new adventures?</p>`,
      dismissible: false,
      buttons: [
        {
          label: 'Yes!',
          variant: 'primary',
          onClick: async () => {
            storageSet(KEYS.permissionChoice, 'yes');
            await this.requestPermission();
          },
        },
        { label: 'Maybe Later', variant: 'secondary', onClick: () => storageSet(KEYS.permissionChoice, 'later') },
        { label: 'No Thanks', variant: 'ghost', onClick: () => storageSet(KEYS.permissionChoice, 'no') },
      ],
    });
    void trigger; // kept for future analytics/personalization hooks, not used yet
  }

  // ---- show() — the universal display gateway ---------------------
  /**
   * @param {string} type - one of the built-in types below, or 'custom'
   * @param {object} [options] - overrides (title/body/icon) + type-specific payload
   */
  show(type, options = {}) {
    const resolved = this.#resolveContent(type, options);
    if (!resolved) return;
    const { title, body, icon, urgency, modalOpts } = resolved;

    // Real OS notification: only when it can actually reach the kid
    // (permission granted) and only when it's not visually redundant
    // (the tab isn't already the focused, visible thing on screen).
    if (this.isGranted() && document.visibilityState === 'hidden') {
      this.#showNative(title, body);
      return;
    }

    // In-app fallback, by urgency — same call site (`show()`) whether
    // or not the browser supports Notifications at all.
    if (urgency === 'high') {
      showModal({
        icon,
        title,
        body: modalOpts?.bodyHTML ?? `<p>${escapeHTML(body)}</p>`,
        buttons: modalOpts?.buttons ?? [{ label: 'Yay!', variant: 'primary' }],
      });
    } else if (urgency === 'medium') {
      showBanner({ icon, text: body });
    } else {
      showSparkleBubble({ text: `${icon} ${body}` });
    }
  }

  #showNative(title, body) {
    try {
      // Respect the in-app sound toggle even for native OS notifications
      // — the OS itself independently respects system-level Do Not
      // Disturb/Focus modes regardless of this flag, which we can't (and
      // shouldn't try to) override from the page.
      const n = new Notification(title, { body, tag: 'learning-quest', silent: !store.get().settings.sound });
      n.onclick = () => { window.focus(); n.close(); };
    } catch {
      // Some browsers throw if constructed from a background/non-window
      // context — fall back to the in-app bubble instead of losing it.
      showSparkleBubble({ text: `💌 ${body}` });
    }
  }

  #resolveContent(type, options) {
    const base = BUILTIN_TYPES[type];
    if (!base && type !== 'custom') {
      console.warn(`Notifications.show: unknown type "${type}"`);
      return null;
    }
    const resolvedBase = typeof base === 'function' ? base(this) : base;
    return { urgency: 'low', ...resolvedBase, ...options };
  }

  // ---- schedule/cancel — delegate straight to the provider ---------
  schedule(type, delay, payload) { return this.#provider.schedule(type, delay, payload); }
  cancel(id) { this.#provider.cancel(id); }
  cancelAll() { this.#provider.cancelAll(); this.#clearIdleTimers(); }

  // ---- daily login reward ------------------------------------------
  #checkDailyReward() {
    const today = todayDateKey();
    const lastReward = storageGet(KEYS.lastReward, null);
    if (lastReward === today) return; // already claimed today

    storageSet(KEYS.lastReward, today);
    addCoins(100);
    bumpPetHappiness(10);

    showModal({
      icon: '🎁',
      title: 'Welcome Back!',
      className: 'reward-modal',
      body: `
        <div style="text-align:center;">
          <div class="reward-popup-icon">🎁</div>
          <div class="reward-popup-line">🪙 +100 Coins</div>
          <div class="reward-popup-line">⭐ +50 XP</div>
          <div class="reward-popup-line">💖 Sparkle Happiness +10</div>
        </div>`,
      buttons: [{ label: 'Yay! 🎉', variant: 'primary' }],
    });
    this.#flyCoins(6);
  }

  #flyCoins(count) {
    if (store.get().settings.reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const coin = document.createElement('div');
      coin.className = 'reward-coin-fly';
      coin.textContent = '🪙';
      coin.style.left = `${45 + randomInt(-10, 10)}%`;
      coin.style.top = '55%';
      coin.style.setProperty('--fly-x', `${randomInt(-80, 80)}px`);
      coin.style.setProperty('--fly-y', `${randomInt(-220, -140)}px`);
      coin.style.animationDelay = `${i * 60}ms`;
      document.body.appendChild(coin);
      setTimeout(() => coin.remove(), 1200 + i * 60);
    }
  }

  // ---- welcome back detection ---------------------------------------
  #showWelcomeBack(gapDays) {
    const threshold = gapDays >= 7 ? 7 : gapDays >= 3 ? 3 : 1;
    const copy = WELCOME_BACK_COPY[threshold];
    const pet = getPetStage(getPet());

    showModal({
      icon: pet.emoji,
      title: copy.title,
      className: copy.anim,
      body: `<p>${this.#greeting()}! ${escapeHTML(this.#randomReminderMessage())}</p>`,
      buttons: [{ label: "Let's go!", variant: 'primary' }],
    });
  }

  #greeting() {
    const hour = new Date().getHours();
    if (hour < 12) return '🌅 Good morning';
    if (hour < 18) return '☀️ Good afternoon';
    return '🌙 Good evening';
  }

  // ---- offline "living world" ----------------------------------------
  #showLivingWorld(previousLoginMs, nowMs) {
    const hoursAway = Math.max(1, Math.round((nowMs - previousLoginMs) / 3_600_000));
    const events = [{ icon: '🌱', text: 'Your garden grew while you were away.' }];

    const coinsFound = Math.min(60, hoursAway * 2);
    if (coinsFound > 0) {
      addCoins(coinsFound);
      events.push({ icon: '🐣', text: `Sparkle collected ${coinsFound} coins while waiting.` });
    }
    if (Math.random() < 0.4) events.push({ icon: '🎁', text: 'A mystery gift appeared on your map.' });

    const chosen = events[randomInt(0, events.length - 1)];
    showToast({ icon: chosen.icon, title: 'While you were away...', subtitle: chosen.text, duration: 4500 });
  }

  // ---- daily play streak + milestone celebrations ---------------------
  #trackDailyStreak(state) {
    // Only bump the streak the first time we see a *new* finished game
    // session today — driven by watching `history` grow, not by opening
    // the app (opening ≠ playing).
    const lastEntry = state.history[0];
    if (!lastEntry) return;
    const playedToday = todayDateKey(new Date(lastEntry.at));
    const lastPlayDateKey = storageGet(KEYS.lastPlayDateKey, null);
    if (playedToday === lastPlayDateKey) return; // already counted today

    const prevDateKey = lastPlayDateKey;
    let streak = storageGet(KEYS.dailyStreak, 0);
    if (prevDateKey) {
      const gap = daysBetween(new Date(prevDateKey), new Date(playedToday));
      streak = gap === 1 ? streak + 1 : 1;
    } else {
      streak = 1;
    }
    storageSet(KEYS.dailyStreak, streak);
    storageSet(KEYS.lastPlayDateKey, playedToday);
    storageSet(KEYS.lastPlay, Date.now());

    this.#maybeCelebrateStreakMilestone(streak);
  }

  #maybeCelebrateStreakMilestone(streak) {
    const milestones = { 7: 'streak_7', 30: 'streak_30', 100: 'streak_100' };
    const achievementId = milestones[streak];
    if (!achievementId) return;
    const celebrated = storageGet(KEYS.streakMilestonesCelebrated, []);
    if (celebrated.includes(streak)) return;
    storageSet(KEYS.streakMilestonesCelebrated, [...celebrated, streak]);

    earnAchievement(achievementId);
    addCoins(streak * 5);
    const achievement = ACHIEVEMENTS[achievementId];
    showModal({
      icon: achievement.icon,
      title: `${streak}-Day Streak!`,
      body: `<p>${escapeHTML(achievement.desc)} You earned <strong>${streak * 5} coins</strong>!</p>`,
      buttons: [{ label: 'Awesome!', variant: 'primary' }],
    });
  }

  // ---- seasonal / weekend / birthday bonuses (delight bonus features) --
  #checkSeasonalEvent() {
    const now = new Date();
    const seasonal = SEASONAL_EVENTS.find((e) => e.test(now));
    if (seasonal) {
      showToast({ icon: seasonal.icon, title: 'Seasonal Event!', subtitle: seasonal.text, duration: 4500 });
    } else if (now.getDay() === 0 || now.getDay() === 6) {
      showToast({ icon: '🎉', title: 'Weekend Bonus!', subtitle: 'Extra sparkle for playing today!', duration: 4000 });
      bumpPetHappiness(5);
    }

    const birthday = storageGet('birthday', null); // 'MM-DD', set via a future profile screen — no-ops until then
    if (birthday) {
      const [m, d] = birthday.split('-').map(Number);
      if (now.getMonth() + 1 === m && now.getDate() === d) {
        addCoins(300);
        showModal({
          icon: '🎂',
          title: 'Happy Birthday!',
          body: '<p>Sparkle baked you a surprise: <strong>+300 coins</strong>!</p>',
          buttons: [{ label: 'Thank you, Sparkle!', variant: 'primary' }],
        });
      }
    }
  }

  // ---- install celebration ----------------------------------------------
  #celebrateInstall() {
    if (storageGet(KEYS.installCelebrationShown, false)) return;
    storageSet(KEYS.installCelebrationShown, true);
    addCoins(250);
    earnAchievement('early_explorer');

    showModal({
      icon: '🎉',
      title: 'Yay! Now we can go on adventures anytime!',
      body: '<p>You unlocked <strong>+250 coins</strong> and the <strong>Early Explorer</strong> badge!</p>',
      buttons: [{ label: 'Woohoo!', variant: 'primary' }],
    });
    this.#flyCoins(10);
  }

  // ---- in-session idle nudges (10 / 20 / 30 min) --------------------------
  /**
   * Idle timers deliberately keep running while the tab is merely
   * *hidden* (backgrounded/switched away) — that's exactly the scenario
   * where the 30-minute native notification is meant to fire. They're
   * only cleared on `pagehide` (the tab is actually closing/navigating
   * away), not on `visibilitychange`. Interaction listeners naturally
   * can't fire while hidden anyway, so no double-bookkeeping is needed.
   */
  #armIdleWatcher() {
    window.addEventListener('pagehide', () => this.#clearIdleTimers());
    window.addEventListener('pageshow', () => this.#resetIdleTimers());

    this.#idleAbort = new AbortController();
    const resetOnInteraction = () => this.#resetIdleTimers();
    ['pointerdown', 'keydown'].forEach((evt) => {
      document.addEventListener(evt, resetOnInteraction, { signal: this.#idleAbort.signal, passive: true });
    });

    this.#resetIdleTimers();
  }

  #clearIdleTimers() {
    this.#idleTimeouts.forEach(clearTimeout);
    this.#idleTimeouts = [];
  }

  #resetIdleTimers() {
    this.#clearIdleTimers();
    this.#idleTimeouts.push(setTimeout(() => this.#onIdle(10), 10 * 60_000));
    this.#idleTimeouts.push(setTimeout(() => this.#onIdle(20), 20 * 60_000));
    this.#idleTimeouts.push(setTimeout(() => this.#onIdle(30), 30 * 60_000));
  }

  #onIdle(minutes) {
    // A tab that's visible and getting a 10/20-min "still here?" nudge
    // doesn't need to interrupt with a modal — only the 30-minute mark
    // (which by then is very likely to be a backgrounded tab) is allowed
    // to reach for a real OS notification via show()'s own visibility check.
    if (minutes === 10 && !document.hidden) {
      showSparkleBubble({ text: "👋 Still here? Let's play!" });
    } else if (minutes === 20 && !document.hidden) {
      showBanner({ icon: '☕', text: 'Need a break? Your adventure will be here when you get back.' });
    } else if (minutes === 30) {
      this.show('idle-30', {});
    }
  }

  // ---- message rotation helper (no immediate repeat) -------------------
  /** Public (not `#`-private) on purpose — BUILTIN_TYPES.sparkle-reminder
   *  needs to call it, and private methods aren't reachable from outside
   *  the class body even via the instance. */
  getReminderMessage() {
    const stage = getPetStage(getPet()).stage;
    const tier = stage <= 2 ? 'curious' : stage <= 4 ? 'cheerful' : 'joyful';
    return this.#randomReminderMessage(tier);
  }

  #randomReminderMessage(tier) {
    const pool = REMINDER_MESSAGES[tier];
    const lastMsg = storageGet(KEYS.lastMessageKey, null);
    let pick = pool[randomInt(0, pool.length - 1)];
    if (pool.length > 1) {
      while (pick === lastMsg) pick = pool[randomInt(0, pool.length - 1)];
    }
    storageSet(KEYS.lastMessageKey, pick);
    return pick;
  }
}

// ============================================================
// Built-in notification types — title/body/icon/urgency defaults.
// `options` passed to show() always wins over these.
// ============================================================
const BUILTIN_TYPES = {
  'sparkle-reminder': (manager) => ({ icon: '💌', title: 'Sparkle', body: manager.getReminderMessage(), urgency: 'low' }),
  'idle-30': { icon: '🌟', title: 'Sparkle', body: 'Your adventure is waiting!', urgency: 'high' },
  'daily-reward': { icon: '🎁', title: 'Welcome Back!', body: 'A gift is waiting for you.', urgency: 'high' },
  'living-world': { icon: '🌱', title: 'While you were away...', body: 'Something happened in your world!', urgency: 'medium' },
  custom: { icon: '🔔', title: 'Learning Quest', body: '', urgency: 'low' },
};

export const Notifications = new NotificationManager();
