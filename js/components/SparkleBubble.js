/**
 * SparkleBubble.js — a small, always-on-top "Sparkle" mascot fixed in the
 * bottom-right corner, used by the notification manager as the in-app
 * fallback for reminder-type messages (playful, but not urgent enough
 * for a full modal). Reuses the `.sparkle-companion*` classes already in
 * components.css (originally built for a roaming version of this same
 * mascot) instead of introducing a parallel set of styles.
 *
 * Lives outside #app (appended directly to <body>) so it survives every
 * screen mount/unmount instead of being wiped out by the renderer.
 */
import { escapeHTML } from '../utils.js';
import { getPet, getPetStage } from '../gamification.js';

let rootEl = null;
let hideTimer = null;

const ensureRoot = () => {
  if (rootEl && document.body.contains(rootEl)) return rootEl;
  rootEl = document.createElement('div');
  rootEl.className = 'sparkle-companion';
  rootEl.style.left = 'auto';
  rootEl.style.right = '18px';
  rootEl.style.bottom = 'calc(18px + env(safe-area-inset-bottom))';
  rootEl.style.top = 'auto';
  rootEl.innerHTML = `
    <div class="sparkle-companion-bubble" id="sparkleBubbleText"></div>
    <div class="sparkle-companion-face" id="sparkleBubbleFace"></div>`;
  document.body.appendChild(rootEl);
  return rootEl;
};

/**
 * Pops Sparkle up in the corner with a speech bubble for `duration` ms.
 * @param {{ text: string, duration?: number, onTap?: Function }} opts
 */
export const showSparkleBubble = ({ text, duration = 5000, onTap = null }) => {
  const root = ensureRoot();
  const face = root.querySelector('#sparkleBubbleFace');
  const bubble = root.querySelector('#sparkleBubbleText');

  face.textContent = getPetStage(getPet()).emoji;
  bubble.innerHTML = escapeHTML(text);

  clearTimeout(hideTimer);
  // Force reflow so re-triggering while already visible still re-animates.
  bubble.classList.remove('show');
  void bubble.offsetWidth;
  requestAnimationFrame(() => bubble.classList.add('show'));

  const dismiss = () => bubble.classList.remove('show');
  face.onclick = () => { onTap ? onTap() : dismiss(); };

  if (duration > 0) hideTimer = setTimeout(dismiss, duration);
  return dismiss;
};
