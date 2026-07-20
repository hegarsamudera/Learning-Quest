/**
 * utils.js — small, dependency-free helpers used across the app.
 * Ported 1:1 from the original monolith's escapeHTML/shuffleArray, plus a
 * few new additions (throttle/debounce/randomInt/createElement) that the
 * rest of the codebase now relies on instead of ad-hoc innerHTML strings.
 */

/** Escapes text for safe insertion into HTML. Always use this (or
 *  textContent / createElement) instead of raw template-literal innerHTML
 *  when the value could contain user- or data-driven text. */
export const escapeHTML = (str) => {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
};

/** Fisher-Yates shuffle. Returns a new array; does not mutate the input. */
export const shuffleArray = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/** Random integer in [min, max], inclusive. */
export const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Pick a random element from an array. */
export const randomPick = (arr) => arr[randomInt(0, arr.length - 1)];

/** Debounce: only run `fn` after `wait` ms of silence. Used for rapid-tap
 *  guards on answer buttons / numpad keys. */
export const debounce = (fn, wait = 150) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
};

/** Throttle: run `fn` at most once every `wait` ms. Used for pointer/resize
 *  driven visual updates. */
export const throttle = (fn, wait = 150) => {
  let last = 0;
  let pendingArgs = null;
  let timer = null;
  return (...args) => {
    const now = Date.now();
    const remaining = wait - (now - last);
    if (remaining <= 0) {
      last = now;
      fn(...args);
    } else {
      pendingArgs = args;
      clearTimeout(timer);
      timer = setTimeout(() => {
        last = Date.now();
        fn(...pendingArgs);
      }, remaining);
    }
  };
};

/**
 * Safe DOM element builder — the "createElement instead of innerHTML"
 * pattern requested for anything built from dynamic/game data.
 *   createElement('div', { className: 'card', textContent: q.prompt }, [child1, child2])
 */
export const createElement = (tag, attrs = {}, children = []) => {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (value === null || value === undefined || value === false) return;
    if (key === 'className') el.className = value;
    else if (key === 'textContent') el.textContent = value;
    else if (key === 'innerHTML') el.innerHTML = value; // only ever pass trusted, pre-escaped HTML here
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'dataset') {
      Object.entries(value).forEach(([dk, dv]) => { el.dataset[dk] = dv; });
    } else {
      el.setAttribute(key, value);
    }
  });
  children.filter(Boolean).forEach((child) => {
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return el;
};

/** Removes all children of a node without leaking listeners on modern
 *  browsers (childNodes are simply detached & garbage collected). */
export const emptyElement = (el) => {
  while (el.firstChild) el.removeChild(el.firstChild);
};

/** Clamp a number between min and max. */
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/** Tiny wrapper around the Vibration API — no-ops silently if unsupported
 *  (iOS Safari, desktop, etc). */
export const haptic = (pattern = 10) => {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch { /* ignore */ }
  }
};
