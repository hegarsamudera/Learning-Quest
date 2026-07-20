/**
 * storage.js — localStorage wrapper with schema versioning.
 *
 * The original monolith read/wrote raw keys like "mathQuest_pet" directly
 * from ~15 different call sites with no version concept. This wrapper keeps
 * the same key prefix (so existing players' save data still loads) but adds
 * a schema version + migration hook so future changes to the save shape
 * don't silently corrupt old saves.
 */

const PREFIX = 'mathQuest_';
const SCHEMA_VERSION = 3; // v2 -> v3: added the re-engagement system (notifications.js)

/**
 * v3 additions (all purely additive — nothing existing changes shape, so
 * no data migration logic is needed beyond bumping the version stamp):
 *   lastLogin, lastReward, lastPlay        - daily reward / welcome-back timing
 *   notif_permissionChoice                 - 'unset'|'yes'|'later'|'no', never re-asks after yes/no
 *   notif_lastPromptedAt                   - throttles "Maybe Later" re-prompts to 1/day
 *   notif_lastPlayDateKey, notif_dailyStreak, notif_streakMilestones
 *                                           - consecutive-day play streak (distinct from the
 *                                             in-game answer streak already in score.streak)
 *   notif_installCelebrationShown          - one-time install reward guard
 *   notif_lastMessageKey                   - avoids repeating the same Sparkle line twice in a row
 *   notif_pendingScheduled                 - { [id]: {type, fireAt, payload} } for Notifications.schedule()
 *                                             catch-up on reopen (see notifications.js docblock for why
 *                                             this can't be true background scheduling without a push server)
 *   birthday                               - optional 'MM-DD', unset until a future profile screen exists
 */
const MIGRATIONS = {
  1: (all) => all, // v1 -> v2: no structural change, just adds the version stamp
  2: (all) => all, // v2 -> v3: purely additive new keys, nothing to transform
};

const readVersion = () => {
  try {
    const raw = localStorage.getItem(`${PREFIX}schemaVersion`);
    return raw ? JSON.parse(raw) : 1;
  } catch {
    return 1;
  }
};

const writeVersion = (v) => {
  try { localStorage.setItem(`${PREFIX}schemaVersion`, JSON.stringify(v)); } catch { /* ignore */ }
};

/** Runs any pending migrations once, on module load. */
const runMigrations = () => {
  let version = readVersion();
  while (version < SCHEMA_VERSION) {
    const migrate = MIGRATIONS[version];
    if (migrate) migrate();
    version += 1;
  }
  writeVersion(SCHEMA_VERSION);
};

export const storageGet = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const storageSet = (key, value) => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    // Storage full / disabled (private browsing) — fail silently, same as before.
    return false;
  }
};

export const storageRemove = (key) => {
  try { localStorage.removeItem(PREFIX + key); } catch { /* ignore */ }
};

/** Wipes every key this app owns (used by the "Reset Progress" modal). */
export const storageClearAll = () => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
};

runMigrations();
