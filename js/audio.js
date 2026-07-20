/**
 * audio.js — sound effects + narration.
 *
 * Voice is ported from the original monolith's `Voice` IIFE almost
 * line-for-line. SFX was rewritten for v2: the original played flat
 * single-oscillator beeps; this version layers 2-3 oscillators per note
 * (root + harmonic + octave sparkle) for actual chime/fanfare character,
 * with small pitch jitter so repeated sounds don't feel robotic. Both
 * engines read "is this on?" from the central store's settings.sound /
 * settings.voice instead of a bare global `gm` object.
 */
import { store } from './state.js';

// -------------------------------------------------------------------
// Voice — kid-friendly narration via the Web Speech API. Fully offline,
// no audio files. Falls back silently on unsupported browsers.
// -------------------------------------------------------------------
const FEMALE_NAME_HINTS = [
  'female', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona',
  'susan', 'zira', 'hazel', 'salli', 'joanna', 'kendra', 'kimberly',
  'google us english', 'google uk english female', 'woman', 'girl',
];

class VoiceEngine {
  #supported = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  #chosenVoice = null;

  constructor() {
    if (this.#supported) {
      this.#pickVoice();
      speechSynthesis.onvoiceschanged = () => this.#pickVoice();
    }
  }

  #pickVoice() {
    const voices = speechSynthesis.getVoices?.() || [];
    if (!voices.length) return;
    const english = voices.filter((v) => /^en/i.test(v.lang));
    const pool = english.length ? english : voices;
    const byHint = pool.filter((v) => {
      const n = v.name.toLowerCase();
      return FEMALE_NAME_HINTS.some((hint) => n.includes(hint));
    });
    this.#chosenVoice = byHint[0] || pool[0] || voices[0] || null;
  }

  isSupported() { return this.#supported; }
  isEnabled() { return this.#supported && store.get().settings.voice; }

  stop() { if (this.#supported) speechSynthesis.cancel(); }

  say(text, opts = {}) {
    if (!this.isEnabled() || !text) return;
    this.stop(); // never overlap lines
    const utter = new SpeechSynthesisUtterance(text);
    if (this.#chosenVoice) utter.voice = this.#chosenVoice;
    utter.rate = opts.rate ?? 0.95;
    utter.pitch = opts.pitch ?? 1.15;
    utter.volume = 1;
    speechSynthesis.speak(utter);
  }

  toggle() {
    const enabled = !store.get().settings.voice;
    store.set((s) => ({ settings: { ...s.settings, voice: enabled } }));
    if (!enabled) this.stop();
    return enabled;
  }
}

// -------------------------------------------------------------------
// SFX — short synthesized chimes via the Web Audio API. Never queues;
// each call plays immediately on its own short-lived oscillator graph.
//
// v2: each "note" is now 2-3 layered oscillators (root + third/fifth +
// a quiet octave-up sparkle) instead of one flat sine tone, so chimes
// have some harmonic body instead of sounding like a phone notification.
// Small per-call pitch jitter keeps rapid-fire correct answers from
// sounding robotically identical.
// -------------------------------------------------------------------
const semitone = (freq, semis) => freq * 2 ** (semis / 12);
const jitter = (cents = 8) => 2 ** ((Math.random() * 2 - 1) * cents / 1200);

class SfxEngine {
  #Ctx = window.AudioContext || window.webkitAudioContext;
  #supported = !!this.#Ctx;
  #ctx = null;

  #ensureCtx() {
    if (!this.#supported) return null;
    if (!this.#ctx) this.#ctx = new this.#Ctx();
    if (this.#ctx.state === 'suspended') this.#ctx.resume();
    return this.#ctx;
  }

  isSupported() { return this.#supported; }
  isEnabled() { return this.#supported && store.get().settings.sound; }

  /** One raw oscillator + gain envelope. Building block for #chord(). */
  #playTone({ freq, duration = 0.15, type = 'sine', delay = 0, gain = 0.18, attack = 0.015 }) {
    const ctx = this.#ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const startAt = ctx.currentTime + delay;
    gainNode.gain.setValueAtTime(0, startAt);
    gainNode.gain.linearRampToValueAtTime(gain, startAt + attack);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.02);
  }

  /** A single "note" made of a root + harmonic layers, so it has body
   *  instead of sounding like a flat beep. `layers` are semitone offsets
   *  from the root with their own relative gain/type/duration multiplier. */
  #note(rootFreq, delay = 0, {
    duration = 0.16, gain = 0.16, layers = [
      { semis: 0, type: 'sine', gainMul: 1, durMul: 1 },
      { semis: 4, type: 'sine', gainMul: 0.4, durMul: 0.85 },      // major third — warmth
      { semis: 12, type: 'triangle', gainMul: 0.18, durMul: 0.5 }, // octave sparkle
    ],
  } = {}) {
    const jit = jitter();
    layers.forEach((layer) => {
      this.#playTone({
        freq: semitone(rootFreq, layer.semis) * jit,
        duration: duration * layer.durMul,
        type: layer.type,
        delay,
        gain: gain * layer.gainMul,
      });
    });
  }

  correct() {
    if (!this.isEnabled()) return;
    // Quick ascending major triad (C-E-G feel) instead of two flat beeps.
    this.#note(660, 0, { duration: 0.16, gain: 0.15 });
    this.#note(831, 0.07, { duration: 0.16, gain: 0.15 });
    this.#note(988, 0.14, { duration: 0.24, gain: 0.17 });
  }

  retry() {
    if (!this.isEnabled()) return;
    // Left understated on purpose — a miss shouldn't feel bad.
    this.#note(220, 0, {
      duration: 0.18, gain: 0.13,
      layers: [{ semis: 0, type: 'triangle', gainMul: 1, durMul: 1 }],
    });
  }

  coin() {
    if (!this.isEnabled()) return;
    // Bright, fast, percussive "plink" — square wave for edge, very
    // short decay so many coins in a row still sound crisp, not muddy.
    this.#note(1760, 0, {
      duration: 0.09, gain: 0.13, layers: [
        { semis: 0, type: 'square', gainMul: 0.55, durMul: 1 },
        { semis: 7, type: 'sine', gainMul: 0.5, durMul: 0.8 },
        { semis: 12, type: 'sine', gainMul: 0.3, durMul: 0.4 },
      ],
    });
    this.#note(2217, 0.05, {
      duration: 0.13, gain: 0.12, layers: [
        { semis: 0, type: 'sine', gainMul: 1, durMul: 1 },
        { semis: 12, type: 'sine', gainMul: 0.25, durMul: 0.5 },
      ],
    });
  }

  achievement() {
    if (!this.isEnabled()) return;
    // Six-note fanfare, each note a small chord, ending on a held
    // resolved major chord instead of a single note.
    const steps = [523, 659, 784, 880, 988, 1047];
    steps.forEach((freq, idx) => {
      this.#note(freq, idx * 0.09, { duration: 0.2, gain: 0.15 });
    });
    this.#note(1047, 0.56, {
      duration: 0.55, gain: 0.16, layers: [
        { semis: 0, type: 'sine', gainMul: 1, durMul: 1 },
        { semis: 4, type: 'sine', gainMul: 0.5, durMul: 0.9 },
        { semis: 7, type: 'sine', gainMul: 0.4, durMul: 0.85 },
        { semis: 12, type: 'triangle', gainMul: 0.2, durMul: 0.6 },
      ],
    });
  }

  toggle() {
    const enabled = !store.get().settings.sound;
    store.set((s) => ({ settings: { ...s.settings, sound: enabled } }));
    return enabled;
  }
}

export const Voice = new VoiceEngine();
export const SFX = new SfxEngine();
