/**
 * Modal.js — a generic centered modal, built on the same
 * `.reset-modal-overlay` / `.reset-modal` skeleton ReportScreen's reset
 * confirmation already uses (reused, not duplicated — see components.css).
 * Used by notifications.js for anything "high urgency" enough to warrant
 * interrupting the kid: the permission pre-ask, daily reward, welcome
 * back, install celebration, and streak milestones.
 */
import { escapeHTML, createElement } from '../utils.js';

/**
 * @param {{
 *   icon?: string, title: string, body?: string,
 *   buttons: Array<{ label: string, variant?: 'primary'|'secondary'|'ghost', onClick?: Function }>,
 *   dismissible?: boolean, className?: string,
 * }} opts
 * @returns {() => void} a close() function
 */
export const showModal = ({ icon = '', title, body = '', buttons = [], dismissible = true, className = '' }) => {
  const overlay = createElement('div', { className: 'reset-modal-overlay' });
  const modal = createElement('div', { className: `reset-modal ${className}`.trim() });

  if (icon) modal.appendChild(createElement('div', { className: 'reset-modal-icon', textContent: icon }));
  modal.appendChild(createElement('h2', { className: 'reset-modal-title', textContent: title }));
  if (body) {
    const bodyEl = createElement('div', { className: 'reset-modal-instruction' });
    bodyEl.innerHTML = body; // caller-controlled trusted HTML (see call sites — never raw user input)
    modal.appendChild(bodyEl);
  }

  const actions = createElement('div', { className: 'reset-modal-actions' });
  const close = () => overlay.remove();
  buttons.forEach((btn) => {
    const btnEl = createElement('button', {
      className: `btn btn-${btn.variant || 'secondary'}`,
      textContent: btn.label,
      onClick: () => { btn.onClick?.(); close(); },
    });
    actions.appendChild(btnEl);
  });
  modal.appendChild(actions);
  overlay.appendChild(modal);

  if (dismissible) {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  }
  document.body.appendChild(overlay);
  return close;
};

/** Convenience: escape freeform text before interpolating into a modal's
 *  `body` HTML string, since `body` itself is treated as trusted HTML. */
export const safe = (text) => escapeHTML(text);
