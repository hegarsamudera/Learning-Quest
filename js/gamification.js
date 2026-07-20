/**
 * gamification.js — coins, streaks, achievements, and the Sparkle pet
 * economy. Ported from the monolith's `gm` object + SPARKLE_* data +
 * feedPet/buyFood/tryEvolve functions, rewired onto the central store
 * instead of bare globals + ad-hoc localStorage calls.
 */
import { store } from './state.js';
import { storageGet, storageSet } from './storage.js';
import { SFX } from './audio.js';

export const ACHIEVEMENTS = {
  first_correct: { title: 'First Correct!', icon: '🌟', desc: 'Answered your first question correctly.' },
  perfect_score: { title: 'Perfect Score!', icon: '🏆', desc: 'Got 100% on a game.' },
  bond_master: { title: 'Bond Master', icon: '⭕', desc: 'Completed Number Bonds.' },
  add_hero: { title: 'Addition Hero', icon: '➕', desc: 'Completed Addition.' },
  sub_star: { title: 'Subtraction Star', icon: '➖', desc: 'Completed Subtraction.' },
  money_pro: { title: 'Money Pro', icon: '💵', desc: 'Completed Money Math.' },
  pattern_pro: { title: 'Pattern Pro', icon: '🔁', desc: 'Completed Skip Counting.' },
  compare_champ: { title: 'Compare Champ', icon: '⚖️', desc: 'Completed Comparing Numbers.' },
  time_master: { title: 'Time Master', icon: '🕐', desc: 'Completed Telling Time.' },
  pattern_detective: { title: 'Pattern Detective!', icon: '🔍', desc: 'Completed Pattern Detective.' },
  bug_hunter: { title: 'Bug Hunter!', icon: '🐛', desc: 'Completed Bug Hunter.' },
  loop_master: { title: 'Loop Master!', icon: '🔁', desc: 'Completed Loop Land.' },
  fn_factory: { title: 'Function Wizard!', icon: '🏭', desc: 'Completed Function Factory.' },
  sort_master: { title: 'Sort Master!', icon: '📊', desc: 'Completed Sort It Out.' },
  logic_pro: { title: 'Logic Pro!', icon: '⚡', desc: 'Completed True or False Machine.' },
  word_wizard: { title: 'Word Wizard!', icon: '📖', desc: 'Completed Word Problems.' },
  number_hunter: { title: 'Number Hunter!', icon: '🔍', desc: 'Completed Missing Number.' },
  expand_expert: { title: 'Expand Expert!', icon: '🔢', desc: 'Completed Expanded Numbers.' },
  double_trouble: { title: 'Double Trouble!', icon: '✌️', desc: 'Completed Doubles & Halves.' },
  // v2.1 — re-engagement system achievements (see notifications.js)
  early_explorer: { title: 'Early Explorer', icon: '🚀', desc: 'Installed Learning Quest as an app.' },
  streak_7: { title: 'Week Warrior', icon: '🏅', desc: 'Played 7 days in a row.' },
  streak_30: { title: 'Monthly Marvel', icon: '🏆', desc: 'Played 30 days in a row.' },
  streak_100: { title: 'Century Streak', icon: '👑', desc: 'Played 100 days in a row.' },
};

// ---- Coins & streak -------------------------------------------------

export const addCoins = (amount) => {
  store.set((s) => ({
    score: {
      ...s.score,
      coins: s.score.coins + amount,
      totalCoinsEarned: s.score.totalCoinsEarned + amount,
    },
  }));
  SFX.coin();
};

export const earnAchievement = (id) => {
  const { achievements } = store.get();
  if (!ACHIEVEMENTS[id] || achievements.includes(id)) return false;
  store.set((s) => ({ achievements: [...s.achievements, id] }));
  SFX.achievement();
  return true;
};

export const bumpStreak = (wasCorrect) => {
  store.set((s) => {
    const streak = wasCorrect ? s.score.streak + 1 : 0;
    return { score: { ...s.score, streak, bestStreak: Math.max(s.score.bestStreak, streak) } };
  });
};

/** Records a finished game session into history (last 20 kept), and
 *  merges its result into the persisted per-game progress map. */
export const recordSession = ({ key, difficulty, correct, total }) => {
  store.set((s) => ({
    progress: {
      ...s.progress,
      [key]: { ...(s.progress[key] || {}), [difficulty]: { correct, total, completedAt: Date.now() } },
    },
    history: [{ key, difficulty, correct, total, at: Date.now() }, ...s.history].slice(0, 20),
  }));
  if (total > 0 && correct === total) earnAchievement('perfect_score');
};

// ---- Sparkle pet economy --------------------------------------------

export const SPARKLE_STAGES = [
  { stage: 1, emoji: '🥚', name: 'Baby Sparkle Pet', desc: 'Your pet is hatching! Feed it to grow.', sparkleToNext: 100, reward: null, rewardKey: null, aura: null },
  { stage: 2, emoji: '🐣', name: 'Young Sparkle Pet', desc: 'Your pet is growing! Keep feeding it!', sparkleToNext: 300, reward: '🎩 Free Hat', rewardKey: 'hat', aura: null },
  { stage: 3, emoji: '🦊', name: 'Adventure Sparkle Pet', desc: 'Your pet loves going on adventures!', sparkleToNext: 700, reward: '🌈 Rainbow Color', rewardKey: 'rainbow', aura: 'glow' },
  { stage: 4, emoji: '🦄', name: 'Hero Sparkle Pet', desc: 'A true hero of sparkle and light!', sparkleToNext: 1500, reward: '✨ Sparkle Trail', rewardKey: 'trail', aura: 'rainbow' },
  { stage: 5, emoji: '🌟', name: 'Legendary Sparkle Pet', desc: 'The most legendary pet in the universe!', sparkleToNext: null, reward: '👑 Legendary Aura', rewardKey: 'legendary', aura: 'legendary' },
];

export const SPARKLE_FOOD = {
  apple: { name: 'Apple', icon: '🍎', cost: 20, power: 5 },
  banana: { name: 'Banana', icon: '🍌', cost: 50, power: 15 },
  cupcake: { name: 'Cupcake', icon: '🧁', cost: 100, power: 35 },
  star: { name: 'Magic Star', icon: '⭐', cost: 250, power: 100 },
};

export const PET_ACCESSORIES = {
  hat: { name: 'Party Hat', icon: '🎩', cost: 0, slot: 'head', evolutionReward: true },
  wings: { name: 'Fairy Wings', icon: '🧚', cost: 0, slot: 'back', evolutionReward: true },
  bow: { name: 'Pink Bow', icon: '🎀', cost: 150, slot: 'head' },
  heart: { name: 'Heart Glasses', icon: '💗', cost: 180, slot: 'face' },
  balloon: { name: 'Party Balloon', icon: '🎈', cost: 150, slot: 'hand' },
  scarf: { name: 'Cozy Scarf', icon: '🧣', cost: 200, slot: 'neck' },
  flower: { name: 'Flower Crown', icon: '🌸', cost: 250, slot: 'head' },
  glasses: { name: 'Cool Shades', icon: '🕶️', cost: 220, slot: 'face' },
  star: { name: 'Star Wand', icon: '✨', cost: 300, slot: 'hand' },
  boots: { name: 'Adventure Boots', icon: '👢', cost: 280, slot: 'feet' },
  umbrella: { name: 'Rainbow Umbrella', icon: '☂️', cost: 320, slot: 'hand' },
  backpack: { name: 'Explorer Backpack', icon: '🎒', cost: 380, slot: 'back' },
  cape: { name: 'Hero Cape', icon: '🦸', cost: 450, slot: 'back' },
  crown: { name: 'Sparkly Crown', icon: '👑', cost: 500, slot: 'head' },
  medal: { name: 'Gold Medal', icon: '🥇', cost: 600, slot: 'neck' },
};

export const PET_COLORS = {
  lavender: { name: 'Lavender', hex: '#C9A8F5' },
  pink: { name: 'Cotton Candy Pink', hex: '#FFB3D9' },
  mint: { name: 'Minty Fresh', hex: '#A8EBD0' },
  sky: { name: 'Sky Blue', hex: '#A8D8F5' },
  sunshine: { name: 'Sunshine Yellow', hex: '#FFE49C' },
  rainbow: { name: 'Rainbow', hex: 'linear-gradient(135deg,#FFB3D9,#C9A8F5,#A8D8F5)' },
};

const DEFAULT_PET = {
  name: '', stageIndex: 0, sparklePower: 0,
  ownedAccessories: [], equipped: [], color: 'lavender',
  foodInventory: {}, unlockedColors: ['lavender', 'pink', 'mint', 'sky', 'sunshine'],
};

/** Lazily initialises pet state in the store the first time it's needed
 *  (mirrors the monolith's storageGet("pet2", DEFAULT_PET) pattern). */
export const getPet = () => {
  let { pet } = store.get();
  if (!pet) {
    pet = storageGet('pet', DEFAULT_PET);
    store.set({ pet });
  }
  return pet;
};

const savePet = (pet) => store.set({ pet });

export const getPetStage = (pet = getPet()) => SPARKLE_STAGES[Math.min(pet.stageIndex, SPARKLE_STAGES.length - 1)];

/** Shared evolution-progress calc so the Pet screen and the roaming
 *  companion always agree on "how close to evolving" a pet is. */
export const getPetEvolutionProgress = (pet = getPet()) => {
  const stage = getPetStage(pet);
  const sp = pet.sparklePower || 0;
  const evoReady = !!(stage.sparkleToNext && sp >= stage.sparkleToNext);
  let pct = 100;
  if (stage.sparkleToNext) {
    let prevSP = 0;
    for (let si = 0; si < pet.stageIndex; si++) prevSP += SPARKLE_STAGES[si].sparkleToNext || 0;
    const stageInto = sp - prevSP;
    pct = Math.max(0, Math.min(100, Math.round((stageInto / stage.sparkleToNext) * 100)));
    if (evoReady) pct = 100;
  }
  return { pct, evoReady, stage, stageIndex: pet.stageIndex, isMaxStage: !stage.sparkleToNext };
};

export const feedPet = (foodKey) => {
  const food = SPARKLE_FOOD[foodKey];
  if (!food) return null;
  const pet = { ...getPet() };
  const inv = { ...(pet.foodInventory || {}) };
  if ((inv[foodKey] || 0) < 1) return null;
  inv[foodKey] -= 1;
  pet.foodInventory = inv;
  pet.sparklePower = (pet.sparklePower || 0) + food.power;
  savePet(pet);
  SFX.coin();
  return food.power;
};

export const buyFood = (foodKey) => {
  const food = SPARKLE_FOOD[foodKey];
  const { score } = store.get();
  if (!food || score.coins < food.cost) return false;
  store.set((s) => ({ score: { ...s.score, coins: s.score.coins - food.cost } }));
  const pet = { ...getPet() };
  const inv = { ...(pet.foodInventory || {}) };
  inv[foodKey] = (inv[foodKey] || 0) + 1;
  pet.foodInventory = inv;
  savePet(pet);
  SFX.achievement();
  return true;
};

/** Attempts evolution; returns the new stage object on success, or null
 *  if not enough Sparkle Power yet / already at max stage. */
/** "Happiness" isn't a separate stat — it's the same sparklePower stat
 *  that drives evolution, so a happiness bump (from a daily reward, a
 *  welcome-back gift, etc) also nudges the pet toward its next stage
 *  instead of creating a second, disconnected number to track. Used by
 *  notifications.js for daily rewards / welcome-back gifts. */
export const bumpPetHappiness = (amount) => {
  const pet = { ...getPet() };
  pet.sparklePower = (pet.sparklePower || 0) + amount;
  savePet(pet);
};

export const tryEvolve = () => {
  const pet = { ...getPet() };
  const stage = getPetStage(pet);
  if (!stage.sparkleToNext || pet.sparklePower < stage.sparkleToNext) return null;

  pet.stageIndex = Math.min(pet.stageIndex + 1, SPARKLE_STAGES.length - 1);
  const newStage = SPARKLE_STAGES[pet.stageIndex];

  if (newStage.rewardKey === 'hat' || newStage.rewardKey === 'trail') {
    const accKey = newStage.rewardKey === 'hat' ? 'hat' : 'wings';
    if (!pet.ownedAccessories.includes(accKey)) {
      pet.ownedAccessories = [...pet.ownedAccessories, accKey];
      pet.equipped = [...pet.equipped, accKey];
    }
  }
  if (newStage.rewardKey === 'rainbow') {
    const unlocked = pet.unlockedColors || DEFAULT_PET.unlockedColors;
    pet.unlockedColors = unlocked.includes('rainbow') ? unlocked : [...unlocked, 'rainbow'];
    pet.color = 'rainbow';
  }

  savePet(pet);
  SFX.achievement();
  return newStage;
};

export const buyAccessory = (key) => {
  const acc = PET_ACCESSORIES[key];
  const { score } = store.get();
  if (!acc || score.coins < acc.cost) return false;
  store.set((s) => ({ score: { ...s.score, coins: s.score.coins - acc.cost } }));
  const pet = { ...getPet() };
  if (!pet.ownedAccessories.includes(key)) pet.ownedAccessories = [...pet.ownedAccessories, key];
  savePet(pet);
  return true;
};

export const setPetColor = (colorKey) => {
  const pet = { ...getPet() };
  if (!(pet.unlockedColors || []).includes(colorKey)) return false;
  pet.color = colorKey;
  savePet(pet);
  return true;
};
