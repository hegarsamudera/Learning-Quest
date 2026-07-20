/**
 * PetCompanion.js — the small pet emoji shown in the Play screen header
 * (and reusable anywhere else). Reacts to correct/incorrect answers with
 * a CSS animation class toggle; all animation itself lives in
 * css/components.css so this stays framework-free.
 */
import { getPet, getPetStage } from '../gamification.js';

export class PetCompanion {
  #el;
  #reactTimer = null;

  constructor(el) {
    this.#el = el;
  }

  render() {
    const stage = getPetStage(getPet());
    this.#el.textContent = stage.emoji;
    this.#el.classList.add('pet-companion-idle');
  }

  /** @param {'happy'|'sad'|'excited'} mood */
  react(mood) {
    if (!this.#el) return;
    clearTimeout(this.#reactTimer);
    this.#el.classList.remove('pet-react-happy', 'pet-react-sad', 'pet-react-excited');
    // Force reflow so re-adding the same class re-triggers the animation.
    void this.#el.offsetWidth;
    this.#el.classList.add(`pet-react-${mood}`);
    this.#reactTimer = setTimeout(() => this.#el.classList.remove(`pet-react-${mood}`), 900);
  }
}
