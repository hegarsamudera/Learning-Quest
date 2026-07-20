/**
 * PlayScreen.js — mounts the current game engine and owns the
 * answer-checking pipeline. Ported from the monolith's renderPlay(),
 * handleAnswer(), advance() and finishGame().
 */
import { store } from '../state.js';
import { replaceScreen } from '../router.js';
import { getGameEngine } from '../games/index.js';
import { escapeHTML } from '../utils.js';
import { Voice, SFX } from '../audio.js';
import { addCoins, bumpStreak, earnAchievement, recordSession } from '../gamification.js';
import { PetCompanion } from '../components/PetCompanion.js';

const PRAISE = ['Awesome! 🎉', 'You got it! ⭐', 'Great job! 🌟', 'Super! 🚀', 'Nailed it! 💪', 'Fantastic! ✨'];
const MAX_RETRIES = 3;
const BASE_COINS = 10;

export class PlayScreen {
  #root;
  #abortController = new AbortController();
  #engine = null;
  #questionAttempts = 0;
  #petCompanion = null;
  #footerObserver = null;

  constructor(root) {
    this.#root = root;
  }

  mount() {
    const { currentGame } = store.get();
    if (!currentGame) { replaceScreen('home'); return; }

    const { meta, questions, index } = currentGame;
    const q = questions[index];
    const pct = Math.round((index / questions.length) * 100);

    this.#root.innerHTML = `
      <div class="screen play-screen" data-accent="${meta.accent}">
        <div class="play-header">
          <div class="top-bar">
            <button class="icon-btn" id="playBackBtn">⬅</button>
            <button class="icon-btn" id="voiceToggleBtn" aria-label="Toggle voice narration"></button>
            <button class="icon-btn" id="sfxToggleBtn" aria-label="Toggle sound effects"></button>
            <span class="play-pet-companion" id="playPetCompanion"></span>
            <div class="score-chip" id="scoreChip"></div>
          </div>
          <div class="progress-label"><span>${escapeHTML(meta.label)}</span><span class="q-count">Question ${index + 1} of ${questions.length}</span></div>
          <div class="progress-track"><div class="progress-fill" id="progressFill" style="width:${pct}%;"></div></div>
          <div class="feedback" id="feedback"></div>
        </div>
        <div class="play-area" id="playArea"></div>
        <div class="play-footer" id="playFooter"></div>
      </div>`;

    this.#wireHeader();
    this.#updateScoreChip();

    this.#petCompanion = new PetCompanion(this.#root.querySelector('#playPetCompanion'));
    this.#petCompanion.render();

    this.#questionAttempts = 0;
    this.#mountQuestion(q, meta);
  }

  #wireHeader() {
    const { signal } = this.#abortController;
    this.#root.querySelector('#playBackBtn').addEventListener('click', () => replaceScreen('difficulty'), { signal });

    const voiceBtn = this.#root.querySelector('#voiceToggleBtn');
    const sfxBtn = this.#root.querySelector('#sfxToggleBtn');
    const updateVoiceUI = () => {
      if (!Voice.isSupported()) { voiceBtn.style.display = 'none'; return; }
      voiceBtn.textContent = store.get().settings.voice ? '🔊' : '🔇';
    };
    const updateSfxUI = () => {
      if (!SFX.isSupported()) { sfxBtn.style.display = 'none'; return; }
      sfxBtn.textContent = store.get().settings.sound ? '🔔' : '🔕';
    };
    voiceBtn.addEventListener('click', () => { Voice.toggle(); updateVoiceUI(); }, { signal });
    sfxBtn.addEventListener('click', () => { SFX.toggle(); updateSfxUI(); }, { signal });
    updateVoiceUI();
    updateSfxUI();
  }

  #updateScoreChip() {
    const chip = this.#root.querySelector('#scoreChip');
    if (!chip) return;
    const { score } = store.get();
    chip.textContent = `🪙 ${score.coins} · 🔥 ${score.streak}`;
  }

  #getEqCard() {
    const playArea = this.#root.querySelector('#playArea');
    return playArea.querySelector('.eq-card') || playArea;
  }

  #lockInputs() {
    this.#root.querySelectorAll('#playArea input, #playArea button, #playFooter input, #playFooter button, .numpad-key')
      .forEach((el) => { el.disabled = true; });
  }

  /** Renderers build their numpad + #checkBtn inline; relocate them into
   *  the fixed bottom dock so they're always reachable with a thumb. A
   *  MutationObserver re-docks after any full re-render the engine does. */
  #dockFooterControls() {
    const footer = this.#root.querySelector('#playFooter');
    const playArea = this.#root.querySelector('#playArea');
    if (!footer || !playArea) return;

    const redock = () => {
      const freshNumpad = playArea.querySelector('.numpad-wrap');
      const freshCheckBtn = playArea.querySelector('#checkBtn, #wpCheck, #mnCheck, #pveCheck, #dhCheck, #siCheckBtn, #tfCheckBtn, #sciCheck');
      if (!freshNumpad && !freshCheckBtn) return;
      footer.innerHTML = '';
      if (freshNumpad) footer.appendChild(freshNumpad);
      if (freshCheckBtn) footer.appendChild(freshCheckBtn);
    };
    redock();

    this.#footerObserver?.disconnect();
    this.#footerObserver = new MutationObserver(redock);
    this.#footerObserver.observe(playArea, { childList: true, subtree: true });
  }

  #mountQuestion(q, meta) {
    const playArea = this.#root.querySelector('#playArea');
    this.#engine = getGameEngine(meta);

    const ctx = {
      correctAnswer: null,
      hintText: null,
      selfManaged: false,
      attemptUsed: this.#questionAttempts > 0,
      reactPet: (mood) => this.#petCompanion?.react(mood),
      onCheck: (isCorrect) => this.#handleAnswer(isCorrect, ctx, q, meta),
    };
    this.#engine.mount(playArea, q, ctx);
    this.#dockFooterControls();
  }

  #handleAnswer(isCorrect, ctx, q, meta) {
    const fb = this.#root.querySelector('#feedback');
    const card = this.#getEqCard();
    const { currentGame } = store.get();

    if (isCorrect) {
      bumpStreak(true);
      const attemptNum = this.#questionAttempts + 1;
      const multiplier = attemptNum === 1 ? 1 : attemptNum === 2 ? 0.5 : attemptNum === 3 ? 0.25 : 0;
      const coinsAwarded = Math.round(BASE_COINS * multiplier);

      fb.className = 'feedback correct';
      card.classList.remove('is-retry', 'is-incorrect');
      card.classList.add('is-correct');
      const praiseMsg = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      fb.textContent = coinsAwarded > 0 ? praiseMsg : `${praiseMsg} (No coins this attempt)`;
      Voice.say(praiseMsg);

      if (coinsAwarded > 0) addCoins(coinsAwarded);
      if (earnAchievement('first_correct')) { /* toast could be shown here via Toast.js */ }
      this.#petCompanion?.react('happy');
      this.#updateScoreChip();
      this.#lockInputs();

      currentGame.correct = (currentGame.correct || 0) + 1;
      store.set({ currentGame });
      setTimeout(() => this.#advance(meta), 1300);
      return;
    }

    // Self-managed engines (e.g. QuizGame) handle their own wrong-answer
    // flow — no retries/hints/locking from us.
    if (ctx.selfManaged) {
      bumpStreak(false);
      this.#petCompanion?.react('sad');
      this.#updateScoreChip();
      currentGame.missed = [...(currentGame.missed || []), { index: currentGame.index, correctAnswer: ctx.correctAnswer ?? null }];
      store.set({ currentGame });
      setTimeout(() => this.#advance(meta), 2200);
      return;
    }

    this.#questionAttempts += 1;
    ctx.attemptUsed = true;

    if (this.#questionAttempts < MAX_RETRIES) {
      const attemptsLeft = MAX_RETRIES - this.#questionAttempts;
      const nextCoins = this.#questionAttempts === 1 ? '½' : this.#questionAttempts === 2 ? '¼' : '0';
      fb.textContent = `Not quite — try again! (${attemptsLeft} ${attemptsLeft === 1 ? 'try' : 'tries'} left · next correct = ${nextCoins} coins)`;
      fb.className = 'feedback retry';
      card.classList.remove('is-correct', 'is-incorrect');
      card.classList.add('is-retry');
      Voice.say('Not quite, try again!');
      SFX.retry();

      if (this.#questionAttempts === 1 && ctx.hintText) {
        const hintEl = document.createElement('div');
        hintEl.className = 'retry-hint';
        hintEl.innerHTML = `<span class="retry-hint-icon">💡</span>${escapeHTML(ctx.hintText)}`;
        card.appendChild(hintEl);
      }

      const npHost = this.#root.querySelector('#playFooter .numpad-wrap') || card.querySelector('.numpad-wrap');
      npHost?.querySelector('[data-key="clear"]')?.click();
      return;
    }

    // Out of retries — reveal the answer and move on.
    bumpStreak(false);
    fb.textContent = "Not quite! Here's the answer:";
    fb.className = 'feedback incorrect';
    card.classList.remove('is-correct', 'is-retry');
    card.classList.add('is-incorrect');
    this.#petCompanion?.react('sad');
    this.#updateScoreChip();

    currentGame.missed = [...(currentGame.missed || []), { index: currentGame.index, correctAnswer: ctx.correctAnswer ?? null }];
    store.set({ currentGame });

    if (ctx.correctAnswer !== null && ctx.correctAnswer !== undefined) {
      Voice.say(`The correct answer was ${ctx.correctAnswer}.`);
      const reveal = document.createElement('div');
      reveal.className = 'reveal-answer';
      reveal.innerHTML = `<span class="reveal-label">Correct answer</span>${escapeHTML(String(ctx.correctAnswer))}`;
      card.appendChild(reveal);
    }

    this.#lockInputs();
    setTimeout(() => this.#advance(meta), 2200);
  }

  #advance(meta) {
    const { currentGame } = store.get();
    currentGame.index += 1;
    this.#questionAttempts = 0;

    if (currentGame.index >= currentGame.questions.length) {
      this.#finishGame(meta);
      return;
    }
    store.set({ currentGame });
    this.unmount();
    this.mount();
  }

  #finishGame(meta) {
    const { currentGame } = store.get();
    const total = currentGame.questions.length;
    const correct = currentGame.correct || 0;
    recordSession({ key: meta.key, difficulty: currentGame.difficulty, correct, total });
    replaceScreen('complete', { currentGame: { ...currentGame, meta } });
  }

  unmount() {
    this.#engine?.unmount();
    this.#footerObserver?.disconnect();
    this.#footerObserver = null;
    this.#abortController.abort();
    this.#abortController = new AbortController();
  }
}
