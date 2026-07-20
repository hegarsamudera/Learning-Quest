/**
 * dataLoader.js — implements the requested lazy-loading strategy:
 *   1. On boot, fetch only data/games.json (metadata for all 49 games).
 *   2. When a subject folder is opened, fetch that subject's question
 *      file (data/math.json, data/science.json, ...) on demand.
 *   3. Cache fetched subject data in memory for the session, and in
 *      IndexedDB so a repeat visit works fully offline even before the
 *      service worker's cache has been (re)populated.
 */
const DB_NAME = 'learningQuestData';
const DB_VERSION = 1;
const STORE = 'subjects';

const memoryCache = new Map();
let dbPromise = null;

const openDB = () => {
  if (!('indexedDB' in window)) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null); // fail soft — memory cache + network still work
    });
  }
  return dbPromise;
};

const idbGet = async (key) => {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    tx.onsuccess = () => resolve(tx.result || null);
    tx.onerror = () => resolve(null);
  });
};

const idbSet = async (key, value) => {
  const db = await openDB();
  if (!db) return;
  db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key);
};

/** Fetches games.json (small, always needed up front). */
export const loadGamesMeta = async () => {
  const cached = memoryCache.get('games');
  if (cached) return cached;
  const res = await fetch('data/games.json');
  const data = await res.json();
  memoryCache.set('games', data);
  return data;
};

/** Fetches (and caches) one subject's question bank on demand. */
export const loadSubjectQuestions = async (subject) => {
  if (memoryCache.has(subject)) return memoryCache.get(subject);

  const offline = await idbGet(subject);
  if (offline && navigator.onLine === false) {
    memoryCache.set(subject, offline);
    return offline;
  }

  try {
    const res = await fetch(`data/${subject}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    memoryCache.set(subject, data);
    idbSet(subject, data);
    return data;
  } catch (err) {
    // Network failed (offline, first visit with no cache yet) — fall back
    // to whatever IndexedDB has, even if it might be stale.
    if (offline) { memoryCache.set(subject, offline); return offline; }
    throw err;
  }
};

/** Convenience: get one game's questions[] once its subject file is loaded. */
export const loadGameQuestions = async (gameMeta) => {
  const subjectData = await loadSubjectQuestions(gameMeta.subject);
  return subjectData[gameMeta.key];
};
