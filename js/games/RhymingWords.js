import { QuizGame } from './QuizGame.js';

/**
 * RhymingWords — same multiple-choice mechanic as every other quiz-style game
 * (see QuizGame.js for the shared implementation + full explanation).
 * This file exists as a named, individually-extensible entry point per
 * the requested file layout; the registry (games/index.js) could equally
 * point straight at QuizGame, but keeping one file per topic makes it
 * obvious where to add topic-specific behaviour later (e.g. a
 * text-to-speech read-aloud button just for RhymingWords) without touching
 * the shared engine.
 */
export class RhymingWords extends QuizGame {}
