/**
 * games/index.js — the registry. Maps a game's `type` (from games.json)
 * to the engine class that renders it, plus a lookup by game `key` for
 * the ~27 quiz-style games that share `type: "scienceQuiz"` but want a
 * named class per topic (see QuizGame.js for why).
 *
 * PlayScreen calls `getGameEngine(gameMeta)` and gets back a fresh
 * instance implementing the BaseGame interface (mount/unmount).
 */
import { PlaceValue } from './PlaceValue.js';
import { NumberBonds } from './NumberBonds.js';
import { Addition } from './Addition.js';
import { Subtraction } from './Subtraction.js';
import { MoneyMath } from './MoneyMath.js';
import { SkipCounting } from './SkipCounting.js';
import { ComparingNumbers } from './ComparingNumbers.js';
import { TellingTime } from './TellingTime.js';
import { Fractions } from './Fractions.js';
import { CodeTheRobot } from './CodeTheRobot.js';
import { LoopLand } from './LoopLand.js';
import { PatternDetective } from './PatternDetective.js';
import { BugHunter } from './BugHunter.js';
import { IfThenRobot } from './IfThenRobot.js';
import { FunctionFactory } from './FunctionFactory.js';
import { SortItOut } from './SortItOut.js';
import { TrueOrFalse } from './TrueOrFalse.js';
import { WordProblems } from './WordProblems.js';
import { MissingNumber } from './MissingNumber.js';
import { PlaceValueExpanded } from './PlaceValueExpanded.js';
import { DoublesHalves } from './DoublesHalves.js';
import { Multiplication } from './Multiplication.js';
import { QuizGame } from './QuizGame.js';

// Named topic wrappers around QuizGame (see QuizGame.js docblock).
import { ScienceQuiz } from './ScienceQuiz.js';
import { MusicalNotes } from './MusicalNotes.js';
import { SightWords } from './SightWords.js';
import { Phonics } from './Phonics.js';
import { Spelling } from './Spelling.js';
import { Sentences } from './Sentences.js';
import { RhymingWords } from './RhymingWords.js';
import { NounsVerbs } from './NounsVerbs.js';
import { Punctuation } from './Punctuation.js';
import { ReadingComprehension } from './ReadingComprehension.js';
import { MapsDirections } from './MapsDirections.js';
import { CommunityHelpers } from './CommunityHelpers.js';
import { WorldContinents } from './WorldContinents.js';
import { NeedsWants } from './NeedsWants.js';
import { HolidaysCultures } from './HolidaysCultures.js';

/** type (from games.json) -> engine class, for every game NOT covered by
 *  the per-key quiz map below. */
const TYPE_REGISTRY = {
  placeValue: PlaceValue,
  numberBonds: NumberBonds,
  addition: Addition,
  subtraction: Subtraction,
  moneyMath: MoneyMath,
  skipCounting: SkipCounting,
  comparingNumbers: ComparingNumbers,
  tellingTime: TellingTime,
  fractions: Fractions,
  codeTheRobot: CodeTheRobot,
  loopLand: LoopLand,
  patternDetective: PatternDetective,
  bugHunter: BugHunter,
  ifThenRobot: IfThenRobot,
  functionFactory: FunctionFactory,
  sortItOut: SortItOut,
  trueOrFalse: TrueOrFalse,
  wordProblems: WordProblems,
  missingNumber: MissingNumber,
  placeValueExpanded: PlaceValueExpanded,
  doublesHalves: DoublesHalves,
  multiplication: Multiplication,
};

/** game `key` -> engine class, for the quiz-shaped games. Every key here
 *  has `type: "scienceQuiz"` in games.json; keys not listed still work
 *  via the generic QuizGame fallback below. */
const QUIZ_KEY_REGISTRY = {
  sightWords: SightWords,
  phonics: Phonics,
  spelling: Spelling,
  sentences: Sentences,
  rhymingWords: RhymingWords,
  nounsVerbs: NounsVerbs,
  punctuation: Punctuation,
  readingComprehension: ReadingComprehension,
  mapsDirections: MapsDirections,
  communityHelpers: CommunityHelpers,
  worldContinents: WorldContinents,
  needsWants: NeedsWants,
  holidaysCultures: HolidaysCultures,
  musicalNotes: MusicalNotes,
  // Every science-subject key uses the generic ScienceQuiz topic class —
  // they don't need their own file since "Science Quiz" already *is*
  // their topic name (unlike English/Social/Arts, which have distinct
  // named games).
  animalLifeCycles: ScienceQuiz,
  plantParts: ScienceQuiz,
  weatherSeasons: ScienceQuiz,
  statesOfMatter: ScienceQuiz,
  humanBody: ScienceQuiz,
  rocksAndSoil: ScienceQuiz,
  solarSystem: ScienceQuiz,
  foodChains: ScienceQuiz,
};

/**
 * @param {{ key: string, type: string }} gameMeta - an entry from games.json
 * @returns {import('./BaseGame.js').BaseGame}
 */
export const getGameEngine = (gameMeta) => {
  if (gameMeta.type === 'scienceQuiz') {
    const Cls = QUIZ_KEY_REGISTRY[gameMeta.key] || QuizGame;
    return new Cls();
  }
  const Cls = TYPE_REGISTRY[gameMeta.type];
  if (!Cls) throw new Error(`No game engine registered for type "${gameMeta.type}" (key: ${gameMeta.key})`);
  return new Cls();
};
