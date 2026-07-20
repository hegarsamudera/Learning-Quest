/**
 * installPrompt.js — "Add to Home Screen" support.
 *
 * Chrome/Edge/Android fire `beforeinstallprompt`; we capture it (the
 * browser only fires it once and only if we call preventDefault()) and
 * expose `triggerInstall()` for a UI button to call later, since Chrome
 * won't show its own mini-infobar once we've intercepted the event.
 *
 * iOS Safari never fires `beforeinstallprompt` — there's no programmatic
 * install API there — so we detect iOS Safari separately and let the UI
 * show a "tap Share → Add to Home Screen" hint instead of a button.
 */
let deferredPrompt = null;
const listeners = new Set();

const notify = () => listeners.forEach((fn) => fn(getInstallState()));

export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches
  || window.navigator.standalone === true; // iOS Safari's own flag

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

export const getInstallState = () => {
  if (isStandalone()) return 'installed';
  if (deferredPrompt) return 'promptable'; // real one-tap install available
  if (isIOS()) return 'ios-manual';        // show the Share-sheet hint instead
  return 'unavailable';                     // browser doesn't support install, or already dismissed this session
};

export const onInstallStateChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const initInstallPrompt = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
  if (window.matchMedia) {
    window.matchMedia('(display-mode: standalone)').addEventListener('change', notify);
  }
};

/** Shows the real browser install prompt. Resolves 'accepted' | 'dismissed' | 'unavailable'. */
export const triggerInstall = async () => {
  if (!deferredPrompt) return 'unavailable';
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice; // 'accepted' | 'dismissed'
  deferredPrompt = null;
  notify();
  return outcome;
};
