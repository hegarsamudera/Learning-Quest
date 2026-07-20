/**
 * BaseGame.js — the interface every game engine implements.
 *
 * This formalizes a pattern the original monolith already used informally
 * (a `RENDERERS[type].mount(stage, question, ctx)` object literal per game
 * type) as a real class hierarchy. Porting was mostly mechanical *because*
 * that interface already existed — each concrete engine below is a fairly
 * direct translation of the corresponding `RENDERERS.xxx` object.
 *
 * Lifecycle:
 *   const game = new SomeGame();
 *   game.mount(stageEl, question, ctx);   // render the question into stageEl
 *   ...user interacts...
 *   ctx.onCheck(isCorrect)                // engine calls this when answered
 *   game.unmount();                       // PlayScreen calls this before mounting the next question
 *
 * `ctx` (provided by PlayScreen) has the shape:
 *   {
 *     correctAnswer: null,     // engines may set this so a miss can show the right answer
 *     onCheck(isCorrect) {},   // call when the question is settled
 *   }
 */
export class BaseGame {
  /** @type {AbortController|null} tracks listeners so unmount() can clean them all up at once */
  _abortController = null;

  /**
   * Render the question UI into `stageEl`. Must be implemented by subclasses.
   * @param {HTMLElement} stageEl
   * @param {object} question
   * @param {object} ctx
   */
  mount(stageEl, question, ctx) {
    throw new Error(`${this.constructor.name} must implement mount()`);
  }

  /** Called by PlayScreen right before the next question mounts (or the
   *  screen unmounts entirely). Default implementation removes all
   *  listeners registered via `this.signal`; override + call super() if a
   *  subclass owns other resources (timers, audio, etc). */
  unmount() {
    this._abortController?.abort();
    this._abortController = null;
  }

  /** An AbortSignal every `addEventListener` call should pass, so
   *  `unmount()` can cancel them all in one shot instead of hand-tracking
   *  every listener (the requested "AbortController for cancellable
   *  timeouts" pattern, applied to DOM listeners too). */
  get signal() {
    if (!this._abortController) this._abortController = new AbortController();
    return this._abortController.signal;
  }
}
