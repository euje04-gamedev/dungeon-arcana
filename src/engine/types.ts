/**
 * Dungeon Arcana — engine types (v0.3: SOLO, against rulebook v2.3, Phase 0 closed)
 *
 * HOW TO READ THE TAGS (every declaration below carries one):
 *   [TWEAK]   Safe to change to adjust a mechanic. Update the matching test and the rulebook too.
 *   [CAREFUL] Changeable, but other code will depend on it. Adding is usually safe; renaming or removing breaks things.
 *   [LOCKED]  Do not touch. Changing it breaks determinism, saves, or the architecture rules.
 *
 * WHERE TO TWEAK MECHANICS: numbers like Court HP/ATK and the Major Arcana codex will live in
 * src/engine/data/ (Phase 2), not in this file. This file defines SHAPES; data files hold NUMBERS.
 *
 * Ground rules [LOCKED]:
 *  - State is plain JSON (no classes, functions, or Maps) so saves and replays are trivial.
 *  - Card DEFINITIONS (stats, text) live in static tables. State only holds references.
 *  - Effect LOGIC lives in code hooks (bottom of file), never in state.
 *  - apply() is pure: same state + same action = same result. The RNG lives in state.
 *  - Solo only. Multiplayer later = turn `player` into `players[]`; hooks already take a Ctx.
 *
 * "DECIDED:" marks a rule settled in design chat or by accepting the README defaults. These override
 * the rulebook text where they differ. The old "GAP:" and "ASSUMED:" markers are all resolved.
 */

// ───────────────────────── Primitives ─────────────────────────

// [CAREFUL] The four suits. Adding a suit means touching every suit-effect table. Do not rename values: saves store them.
export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';
// [CAREFUL] The four Court ranks. Their HP and ATK are in the Court stat table (Phase 2), not here.
export type CourtRank = 'page' | 'knight' | 'queen' | 'king';
// [LOCKED] A card's unique id. A plain string so it survives JSON saves.
export type CardId = string;

// [LOCKED] A grid coordinate. x grows East, y grows North or South per the maze module (Phase 3).
export type Pos = { x: number; y: number };
// [LOCKED] A coordinate as a string key like "2,-1". The grid is unbounded, so the maze is a sparse map, not an array.
export type PosKey = `${number},${number}`;

// [TWEAK] Dice pool: how many d6 to roll. count is limited to 1–4 by the rulebook (Page 1d6 … King 4d6). Widen the union (e.g. add 5) for a harder boss; sides is fixed at 6.
export type DicePool = { count: 1 | 2 | 3 | 4; sides: 6 };
// [LOCKED] Seeded RNG state. `seed` + `cursor` reproduce every roll; cursor advances once per die rolled. Changing this shape breaks replays and saves.
export type Rng = { seed: string; cursor: number };

// [TWEAK] The health cap (rulebook Section 3). Healing can never push you above this. The smoke test checks this value; change both together.
export const MAX_HEALTH = 30;

// ───────────────────────── Cards ─────────────────────────

// [LOCKED] A Player Deck card. value: 1 = Ace (played as 1 or 11), 2–10 = face value.
export type MinorCard = { id: CardId; suit: Suit; value: number };

// [LOCKED] A card in the Dungeon Deck (16 Court + 22 Major = 38).
export type DungeonCard =
  // [LOCKED] Court card: has a suit and a rank.
  | { kind: 'court'; id: CardId; suit: Suit; rank: CourtRank }
  // [LOCKED] Major Arcana card: number runs 0 (Fool) … 21 (World).
  | { kind: 'major'; id: CardId; number: number };

// Static data, not stored in state:
//   COURT_STATS: Record<CourtRank, { hp: number; atk: DicePool }>   (Phase 2; tweak Court HP/ATK there)
//   CODEX: Record<number, MajorDef>                                  (Phase 2; tweak Major HP/ATK/text there)
// [CAREFUL] The full definition of one Major Arcana card.
export type MajorDef = {
  number: number; // [LOCKED] 0–21, matches DungeonCard.number.
  name: string; // [TWEAK] Display name.
  atk: DicePool | 'justice'; // [CAREFUL] Justice has no ATK. It is a one-combo duel.
  hp: number; // [TWEAK] Starting HP (rulebook Section 9). Justice is fixed at 26 by design.
  boss: BossHooks; // [CAREFUL] What the card does when you FACE it.
  spell: SpellDef; // [CAREFUL] What the card does when you BURN it.
};

// ───────────────────────── The maze ─────────────────────────

// [CAREFUL] One square of the dungeon.
export type Tile = {
  pos: Pos; // [LOCKED] Where this tile sits on the grid.
  card: DungeonCard | null; // [LOCKED] null = cleared or destroyed: walkable, nothing triggers.
  revealed: boolean; // [LOCKED] false = still face-down. Stepping on it flips it.
  damage: number; // [LOCKED] HP left = maxHp(card) - damage. Carries over between turns.
};

// ───────────────────────── The player ─────────────────────────

// [CAREFUL] Everything about the one player. Becomes players[] when co-op arrives.
export type Player = {
  health: number; // [LOCKED] 0..MAX_HEALTH. Hitting 0 ends the run (no spectating when solo).
  hand: MinorCard[]; // [LOCKED] No max hand size (rulebook Section 5).
  spells: DungeonCard[]; // [LOCKED] Owned and unburned. Survive wipes AND runs.
  pos: Pos; // [LOCKED] Current tile coordinate.
  engagement: Engagement | null; // [LOCKED] null = not fighting anything right now.
};

// [CAREFUL] Effects that last until the tile falls or the player retreats.
export type Engagement = { tile: PosKey; marks: Mark[] };

// [CAREFUL] A temporary effect attached to one fight. Add a variant to add a new boss restriction.
export type Mark =
  | { type: 'halveNextDamage' } // Wands Court retaliation: your next damage is halved.
  | { type: 'bannedSuit'; suit: Suit } // The Tower: this suit cannot be played.
  | { type: 'bannedValues'; values: number[] } // High Priestess: the UI hides these, the engine knows.
  | { type: 'bannedCard'; card: CardId }; // The Hanged Man: your highest card at fight start.

// ───────────────────────── Run (one maze, start to finish) ─────────────────────────

// [LOCKED] Which stage the run is in.
export type Phase =
  | { type: 'entranceFight' } // Stuck on the Guardian until it falls.
  | { type: 'explore' } // Free movement.
  | { type: 'ended'; result: 'wipe' | 'victory' }; // Run over.

// [LOCKED] Engage and Draw happen automatically between these two. The player only decides these.
// Spells can be burned in either step ("at any point on your turn").
export type TurnStep = 'move' | 'act';

// [CAREFUL] Everything about one generated maze.
export type Run = {
  tiles: Partial<Record<PosKey, Tile>>; // [LOCKED] Sparse map of the whole maze.
  entrance: Pos; // [LOCKED] The origin tile (Entrance Guardian).
  player: Player; // [LOCKED] The one player.
  step: TurnStep; // [LOCKED] Whether the player is choosing a move or an action.
  turn: number; // [LOCKED] Solo: a "Round" in the rulebook is just a turn.
  phase: Phase; // [LOCKED] Current stage of the run.
  drawPile: MinorCard[]; // [LOCKED] Empty → shuffle discardPile into it (rulebook, Section 5).
  discardPile: MinorCard[]; // [LOCKED] Played and discarded cards.
  burned: DungeonCard[]; // [LOCKED] Spells burned this run. They return to the dungeon next run.
  interrupt: Interrupt | null; // [LOCKED] Engine is paused, waiting for RESPOND.
  rng: Rng; // [LOCKED] Seeded randomness lives here, never in a global.
};

// [CAREFUL] "Burn when X happens" spells (The Moon) need a window where the engine stops and asks.
export type Interrupt = { type: 'atkRolled'; source: PosKey; dice: number[] };

// ───────────────────────── Campaign (survives wipes) ─────────────────────────

// [LOCKED] The whole saved game. Wipes end a Run, never the Campaign.
export type Campaign = {
  version: 1; // [LOCKED] Save-format version. Bump it (and write a migration) if this shape ever changes.
  seed: string; // [LOCKED] Master seed for the campaign.
  runNumber: number; // [LOCKED] Which attempt this is (1, 2, 3…).
  status: 'ongoing' | 'won'; // [LOCKED] Becomes 'won' when The World falls.
  spells: DungeonCard[]; // [LOCKED] Held between runs.
  dungeonPool: DungeonCard[]; // [LOCKED] What the next run's maze is built from.
  removedDungeon: DungeonCard[]; // [LOCKED] Death's spell: destroyed tiles, never return, no spell reward.
  removedMinor: MinorCard[]; // [LOCKED] Death as boss: gone from the Player Deck for good.
  run: Run | null; // [LOCKED] The current run, or null between runs.
};

/**
 * DECIDED (Death, the spell): destroys the tile you are ENGAGED with, never "any tile".
 *   - target goes to removedDungeon: no Spell reward, never returns, no onDefeat triggers
 *   - Death itself is burned as normal (Burned Pile, can return next run)
 *   - EXCEPT against The World: the World is untouched and DEATH is destroyed (removedDungeon)
 * DECIDED (Death, the boss): removes the lowest-value card from hand permanently (removedMinor).
 *   Ace counts as 1. Ties are the player's pick. (Default accepted in Phase 0.)
 * Death has two permanent removals, so the rulebook lines calling the boss ability "the only"
 * one (Sections 6 and 9) need editing.
 *
 * DECIDED: a destroyed tile counts as cleared for The World's gate and for the Entrance fight.
 * DECIDED: if no Court Card is left in the pool, there is no Entrance Guardian and the run
 *          starts in `explore`.
 */

// ───────────────────────── Actions (everything the player can do) ─────────────────────────

// [LOCKED] One card in a combo. Ace value is declared when played.
export type PlayedCard = { card: CardId; aceAs?: 1 | 11 };

// [CAREFUL] Everything the player can ask the engine to do. Add variants freely; do not rename existing ones (saves and replays store them).
export type Action =
  | { type: 'MOVE'; to: Pos } // Adjacent tile only.
  | { type: 'STAY' } // Skip the move step.
  // DECIDED: UI = select cards, press Play. Minimum 1 card (non-empty tuple). The combo is
  // committed on Play, so cards drawn by Pentacles land in hand AFTER and can't join it.
  // Array order = play order (Hierophant cares).
  | { type: 'PLAY_COMBO'; cards: [PlayedCard, ...PlayedCard[]] }
  | { type: 'BURN_SPELL'; spell: CardId; choice?: SpellChoice } // Burn an owned Spell, with a choice if it needs one.
  | { type: 'RESPOND'; use: { spell: CardId; discard: CardId[] } | null } // Answer an Interrupt (null = decline).
  | { type: 'END_TURN' }; // Finish the turn.

// [CAREFUL] One variant per spell that needs a decision. Most spells need none.
export type SpellChoice =
  | { spell: 'magician'; card: CardId; suit: Suit } // Convert one hand card to a chosen suit.
  | { spell: 'lovers'; cards: [CardId, CardId] } // Combine two hand cards into one.
  | { spell: 'highPriestess'; order: [CardId, CardId, CardId] } // New order for the next 3 draws.
  | { spell: 'judgement'; reclaim: CardId }; // Pick a card from the burned pile.

// ───────────────────────── Events (what apply() emits, which the UI animates) ─────────────────────────

// [CAREFUL] Facts about what just happened. The UI animates these and the game log prints them. Add freely; renaming breaks the UI.
export type GameEvent =
  | { type: 'tileRevealed'; tile: PosKey } // A face-down tile flipped.
  | { type: 'diceRolled'; by: 'tile' | 'player'; dice: number[]; reason: string } // Any dice roll, with why.
  | { type: 'tileDamaged'; tile: PosKey; amount: number } // Damage dealt to a tile.
  | { type: 'playerDamaged'; amount: number } // Damage dealt to the player.
  | { type: 'playerHealed'; amount: number } // Player healed (already capped at MAX_HEALTH).
  | { type: 'cardsDrawn'; count: number } // Cards drawn from the Draw Pile.
  | { type: 'cardsDiscarded'; cards: CardId[] } // Cards sent to the Discard Pile.
  | { type: 'tileDefeated'; tile: PosKey } // A tile hit 0 HP and became a Spell.
  | { type: 'tileDestroyed'; tile: PosKey } // Death's spell removed a tile for good.
  | { type: 'spellDestroyed'; card: CardId } // Death burned against The World.
  | { type: 'spellGained'; card: CardId } // A defeated tile became an owned Spell.
  | { type: 'spellBurned'; card: CardId } // A Spell was used up.
  | { type: 'runEnded'; result: 'wipe' | 'victory' }; // Run over.

// ───────────────────────── The engine's public surface ─────────────────────────

// [LOCKED] What apply() returns: the new state plus events, or an error. Never throw for illegal moves.
export type Result =
  { ok: true; state: Campaign; events: GameEvent[] } | { ok: false; error: string };

// [LOCKED] The one function that changes the game. Pure: same state + same action = same result. (Implemented in Phase 3.)
export declare function apply(state: Campaign, action: Action): Result;
// [LOCKED] Everything the player may do right now; the UI greys out the rest. (Implemented in Phase 3.)
export declare function legalActions(state: Campaign): Action[];

/**
 * Powers "select cards, press Play". Pure, changes nothing. The total INCLUDES the Swords
 * bonus (DECIDED). During The Moon's blind rounds it returns { hidden: true } so the UI
 * can't leak values the rules say you don't get to see.
 */
// [CAREFUL] The preview result: hidden during Moon blind turns, otherwise a total plus warnings.
export type ComboPreview =
  | { hidden: true } // Moon blind round: show nothing.
  | { hidden: false; total: number; fizzles: boolean; blockedCards: CardId[] }; // total includes Swords bonus.
// [LOCKED] Implemented in Phase 3.
export declare function previewCombo(state: Campaign, cards: PlayedCard[]): ComboPreview;

// ───────────────────────── Effect hooks (code, not state) ─────────────────────────

// [LOCKED] The context every hook receives: the run and the tile being fought. Keeps co-op possible later.
type Ctx = { run: Run; tile: PosKey };
// [LOCKED] What every hook returns: the updated run plus events to animate.
type Fx = { run: Run; events: GameEvent[] };

/**
 * Boss rules split into two kinds, and the engine must treat them differently:
 *   "cannot play"       → rejected BEFORE cards leave the hand (Tower suit, Priestess numbers, Hanged Man)
 *   "plays but fizzles" → cards are spent, damage is 0, boss still hits (Hierophant, Lovers, Temperance)
 *
 * Combo pipeline (DECIDED):
 *   1. restrictPlay     reject banned cards
 *   2. combo total      face values (Aces as declared) PLUS Swords bonus. Swords is part of the
 *                       maths, not an afterthought. This is the number Justice (>= 26) and
 *                       Temperance (exact remaining HP) compare against.
 *   3. judgeCombo       ok | fizzle, judged on that total
 *   4. other bonuses    Wands: bank an ATK reduction. Cups: heal. Pentacles: draw (after Play).
 *   5. modifyDamage     Strength, Chariot, Wands-Court halving
 *   6. apply to tile    if HP <= 0 → onDefeat
 *   7. if it survived:  roll ATK → Interrupt window (Moon rerolls the RAW dice)
 *                       → subtract Wands/Strength reduction (floor 0)
 *                       → THEN Court retaliation effects ("effects are after"), working off the
 *                         reduced number: Swords x1.5, Cups heals half, Pentacles discards half
 *                       → deal the result to the player.
 *                       DECIDED: Cups/Pentacles use the reduced number, not the raw roll.
 *                       DECIDED: Court retaliation maths rounds DOWN (rulebook Section 6 states
 *                       "All math rounds down"), so Swords x1.5 rounds down too.
 *
 * SOLO ADAPTATIONS (card text that breaks with one player):
 *   Entrance Guardian: "as a group" → just you.          Defeat: health 0 ends the run immediately.
 *   Hermit "fought alone": always true, so it's a vanilla boss for now.
 *   Star: only the "below 50% health" clause applies.     Emperor: halves YOUR hand.
 *   Moon "first 2 rounds" = first 2 turns of the fight.   Judgement: "last tile YOU defeated".
 *
 * DECIDED: Empress "+3 HP each Round it isn't defeated" only ticks while you are in combat with her.
 *      Solo that means once per turn you end engaged with her and she survived. Walk away and
 *      she stops healing. The tick comes after her retaliation, at the end of your turn.
 * DECIDED: Judgement as boss: the refought tile returns to the map on the tile it was originally
 *      defeated on, at full HP.
 */
// [CAREFUL] Optional hooks a boss can define. A boss with no hooks is a vanilla fight (e.g. Wheel of Fortune). Add a hook name here only if the engine will also call it.
export type BossHooks = {
  canEngage?(c: Ctx): boolean; // Star (<50% health), World (all other tiles cleared)
  onEngage?(c: Ctx): Fx; // Fool, Emperor, Tower, Moon, Hanged Man
  restrictPlay?(c: Ctx, card: MinorCard): boolean; // "Cannot play" rules; true = card is banned
  judgeCombo?(c: Ctx, cards: PlayedCard[]): 'ok' | 'fizzle'; // "Plays but fizzles" rules
  modifyDamage?(c: Ctx, dealt: number): number; // Strength, Chariot, Wands-Court halving
  onRetaliate?(c: Ctx, rolled: number[]): Fx; // High Priestess, Court suit effects
  onDefeat?(c: Ctx): Fx; // Death, Sun, Devil, Judgement
};

// [CAREFUL] What a Spell does when burned.
export type SpellDef = {
  burn(c: Ctx & { choice?: SpellChoice }): Fx; // The spell's effect; choice is present only if the spell needs one.
  reactsTo?: Interrupt['type']; // Set for "burn when X happens" spells (The Moon).
};
