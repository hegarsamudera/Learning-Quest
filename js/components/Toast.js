/**
 * Toast.js — a small auto-dismissing banner, ported from the monolith's
 * showAchievementToast() and generalized for reuse (e.g. "Copied!" style
 * confirmations elsewhere, not just achievement unlocks).
 */
import { escapeHTML } from '../utils.js';

let hostEl = null;
const ensureHost = () => {
  if (hostEl && document.body.contains(hostEl)) return hostEl;
  hostEl = document.createElement('div');
  hostEl.className = 'toast-host';
  hostEl.setAttribute('aria-live', 'polite');
  document.body.appendChild(hostEl);
  return hostEl;
};

/**
 * @param {{ icon?: string, title: string, subtitle?: string, duration?: number }} opts
 */
export const showToast = ({ icon = '🏆', title, subtitle = '', duration = 3200 }) => {
  const host = ensureHost();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-body">
      <span class="toast-title">${escapeHTML(title)}</span>
      ${subtitle ? `<span class="toast-subtitle">${escapeHTML(subtitle)}</span>` : ''}
    </span>`;
  host.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visible'));
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

export const showAchievementToast = (achievement) => {
  showToast({ icon: achievement.icon, title: achievement.title, subtitle: achievement.desc });
};

// --------------------------------------------------------------------
// Banner — a slim top bar for messages a bit more attention-worthy than
// a toast but not urgent enough for a full modal (e.g. an idle nudge,
// or the notification fallback for browsers without the Notification API).
// --------------------------------------------------------------------
let bannerEl = null;

/**
 * @param {{ icon?: string, text: string, actionLabel?: string, onAction?: Function, duration?: number }} opts
 */
export const showBanner = ({ icon = '🔔', text, actionLabel = '', onAction = null, duration = 6000 }) => {
  bannerEl?.remove();
  const banner = document.createElement('div');
  banner.className = 'notif-banner';
  banner.setAttribute('role', 'status');
  banner.innerHTML = `
    <span class="notif-banner-icon">${icon}</span>
    <span class="notif-banner-text">${escapeHTML(text)}</span>
    ${actionLabel ? `<button class="notif-banner-action">${escapeHTML(actionLabel)}</button>` : ''}
    <button class="notif-banner-close" aria-label="Dismiss">✕</button>`;
  document.body.appendChild(banner);
  bannerEl = banner;

  const dismiss = () => { banner.classList.remove('notif-banner-visible'); setTimeout(() => banner.remove(), 300); };
  banner.querySelector('.notif-banner-close').addEventListener('click', dismiss);
  if (actionLabel) banner.querySelector('.notif-banner-action').addEventListener('click', () => { onAction?.(); dismiss(); });

  requestAnimationFrame(() => banner.classList.add('notif-banner-visible'));
  if (duration > 0) setTimeout(dismiss, duration);
  return dismiss;
};
