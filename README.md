# Dungeon Arcana (Web, Solo)

A browser adaptation of the *Dungeon Arcana* tabletop roguelite (rulebook v2.3): a tarot-deck dungeon crawler where every boss you beat becomes a one-time spell, and every spell you burn comes back to haunt the next run.

**Status:** Phase 0 (design) and Phase 1 (scaffold) complete. Phase 2 (data and primitives) is next.

---

## Project scope

### Goal
A complete, single-player campaign that runs **fully offline** in the browser: from the first Entrance Guardian to defeating The World, with campaign progress saved on the device.

### In scope (v1)
- One player, one character (30 Health, 5-card starting hand)
- Full ruleset: hidden maze generation, move / engage / draw / act turns, combat, suit effects, Court retaliation, all 22 Major Arcana passives and spells, Spell burning, run reshuffle, campaign win
- Deterministic engine driven by a seed (same seed + same actions = same game)
- Local campaign saves
- Installable, offline-first PWA
- Mobile-first UI

### Out of scope (v1)
- Multiplayer of any kind (co-op, PvP bonus mode)
- Accounts, servers, cloud saves, leaderboards
- Alternate rulesets and house rules from the rulebook (shared Spell Hand, shared health pool, fixed layouts)

### Success criteria
- [ ] A full campaign can be played start to finish, offline, on a phone
- [ ] Every card effect has an automated test
- [ ] A seeded random-bot can play thousands of games with zero illegal states
- [ ] Closing and reopening the app resumes the campaign exactly

---

## Tech stack

| Piece | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | The rules are full of rounding and edge cases; types catch mistakes |
| Build | Vite | Fast dev loop, plain static output |
| UI | Svelte 5 | Built-in transitions and springs for card flips and reveals, tiny bundle. Chosen over React: Figma designs work with either, the engine is plain TypeScript, and Svelte needs less animation code |
| Layout | DOM + CSS (Grid, 3D transforms) | Cards, text and a tile map of at most 39 tiles. The 2.5D map is a tilted CSS 3D grid. PixiJS or Three.js only if lighting or fog shaders are wanted later |
| Offline | PWA via `vite-plugin-pwa` | Service worker caches everything after first load |
| Saves | IndexedDB | Campaign state is small JSON, no backend required |
| Tests | Vitest | One test per card effect |

TypeScript is pinned to 6.x: TypeScript 7 is not yet supported by `typescript-eslint` or `svelte-check` (see `docs/CONFIG_GUIDE.md`).

Note: service workers do not run from `file://`. The first load must come from a server (localhost or hosted); after that it works offline.

---

## Architecture principles

1. **The engine is a standalone module with zero UI code.** The UI renders state and sends actions.
2. **`apply(state, action)` is pure.** It returns the new state plus a list of events. The UI animates the events.
3. **State is plain JSON.** No classes, functions or Maps, so saves and replays are trivial.
4. **The RNG lives in state** (`{ seed, cursor }`). Reproducible bugs, shareable seeds.
5. **Card definitions are static data. Effect logic is code hooks.** State only holds references.
6. **Shape stays multi-player-ready** (hooks take a context object) so co-op can come later without a rewrite.

Public engine surface (see `src/engine/types.ts`):
- `apply(state, action)` returns the new state and events, or an error
- `legalActions(state)` lets the UI grey out everything else
- `previewCombo(state, cards)` drives the live total on the "select cards, press Play" screen. It returns `hidden` during The Moon's blind rounds.

### Planned structure
```
src/
  engine/        pure TypeScript, no DOM
    types.ts
    data/        Court stats, Major Arcana codex
    rng.ts  maze.ts  combat.ts  spells.ts  apply.ts
    bosses/      one file per Major Arcana passive
  ui/            Svelte components. All drawing code lives here, never in engine/
    components/  Card, Frame, Badge, Pips, Hand, CombatScreen, MapScreen
    assets/cards/  illustration layers, named by card id
    animation/   event queue that plays engine events in order
  storage/       IndexedDB save/load
tests/
```

---

## Rule decisions

These came out of design chat and **override the rulebook text** where they differ.

| # | Decision |
|---|---|
| 1 | Combo UI: select 1 or more cards, then press Play. |
| 2 | The combo total **includes the Swords bonus**. Justice (>= 26) and Temperance (exact remaining HP) compare against that total. |
| 3 | Court retaliation effects apply **after** ATK reductions are subtracted. |
| 4 | Death's spell destroys the tile you are engaged with: no Spell reward, never returns. Burned against The World, the World is untouched and Death is destroyed instead. |
| 5 | Engagement is per-player (moot in solo). |
| 6 | Solo v1: no multiplayer. |
| 7 | The Empress only heals (+3 HP) while you are in combat with her. Walking away stops it. |

Rulebook edits needed: Sections 6 and 9 call Death's boss ability the only permanent removal of a card, which is no longer true given #4.

### Confirmed defaults (accepted in Phase 0)
These began as proposals and are now accepted. Change any of them freely, but update the tests and the comments in `types.ts` too.

| Topic | Proposed default |
|---|---|
| Cups / Pentacles Court effects | Use the ATK number after reductions, not the raw roll |
| Swords-Court x1.5 rounding | Round down (rulebook Section 6 states "All math rounds down") |
| Death-destroyed tile | Counts as cleared for The World's gate and the Entrance fight |
| Death as boss | Removes the lowest-value card from hand; Ace counts as 1; ties are the player's pick |
| No Court Card left in the pool | Skip the Entrance Guardian; the run starts in explore |
| Judgement's refought tile | Returns to the tile where it was originally defeated, at full HP |
| Pentacles draw timing | Cards drawn land in hand after Play and cannot join that combo |
| "Round" in solo | One round = one turn |
| The Moon "first 2 rounds" | First 2 turns of the fight |
| Empress tick timing | End of your turn, after her retaliation |
| Hermit, Star in solo | Hermit's "fought alone" is always true; only Star's "below 50% Health" clause applies |

### Card art and UI direction
Decided: **hybrid**. Dedicated illustration files, with everything else drawn in code from the data tables. A text-only face remains the fallback for any card with no image.

**Dedicated assets**
- 38 dungeon cards (16 Court + 22 Major), each as **two layers**: a background plate and a transparent character cutout. The cutout is what pops out of the frame, looms on the combat screen, and stands on the map.
- 4 Aces and 1 card back.
- Filenames are the card id. The data tables map card id to files, and the files live in `src/ui/assets/cards/`.
- Shown with `image-rendering: pixelated` at whole-number scales. Enemies need larger cutouts than hand cards for the full-width splash.

**Built in code (data-driven, so balance changes never mean redrawing)**
- Frames, name banners, HP / ATK / rank badges, suit colors and suit icons
- Minor card pips for 2-10, and all card text

**Prototype status**
- Current art is AI-generated and used as reference for the prototype. The plan is to remake it in Figma: cards as components with variants (suit, rank, boss or spell face), text as properties that match the data fields, frames and badges as vectors.
- Check the generation tool's terms before any public release.

**Combat screen** (turn-based, enemy art looming Balatro-style)
```
┌────────────────────────┐
│   enemy art looms      │
│   HP · ATK · marks     │
├────────────────────────┤
│ card history           │
├────────────────────────┤
│ ♥ 24/30   spells       │
│ [card][card][card]     │
│ deck 12      discard 8 │
└────────────────────────┘
```

**Explore screen:** a 2.5D tilted CSS 3D grid with enemy cutouts as billboards. Build a flat map first and swap the 2.5D version in later. Both read the same state.

**Animation rules**
- Selecting a card pops the cutout out of its frame (the plate stays clipped, the cutout lifts and scales). Engaging flips the card in CSS 3D into the enemy splash.
- Animate only `transform` and `opacity` to stay smooth on phones. Respect the reduced-motion setting.
- The UI queues engine events (`tileRevealed`, `diceRolled`, `tileDamaged`...) and plays them in order. The engine never knows about animation timing.
- Foil-style shimmer is faked with CSS gradients (Phase 8).

**Art issues to fix in the Figma remake**
- Majors and Pentacles Courts both use gold frames. Give Majors a distinct frame so boss tiles stand out on the map.
- Every Major and Court card needs a **spell face**, not only the boss face.
- Card text still has multiplayer wording: Empress says "+3 HP each Round" (decision #7: only while you fight her), and Death, Emperor, Hermit and Star mention "each player" or "allies".
- Page and Knight of Swords are dark at small size. Add a rim light and test at about 90px tile size.
- The red ATK triangle reads like a d4. Consider a d6 icon.
- Minor cards: stray diamond on the 7s, overlapping pips on the 9 and 10, and the Wands corner icon reads like an anchor.

---

## Progress checklist

Each phase has an exit test. Don't start the next phase until it passes.

### Phase 0: Design and rules
- [x] Read and analyse rulebook v2.3
- [x] Choose stack
- [x] Draft engine types (`types.ts`)
- [x] Settle the main rule gaps (see Rule decisions)
- [x] Confirm or change the "assumed" defaults above (all accepted)
- [x] Choose card art source (hybrid: illustration layers + code-built frames, see Card art and UI direction)

**Exit:** no open gap blocks the engine. ✅ Met.

### Phase 1: Scaffold
- [x] Vite + TypeScript (strict) + Svelte 5 project
- [x] Vitest wired up, one passing test
- [x] Lint + format config
- [x] Move `types.ts` into `src/engine/`
- [x] Dev scripts: `dev`, `build`, `test` (plus `lint`, `format`, `typecheck`, `check`)

**Exit:** `test` and `build` both run clean. ✅ Met (also lint, format and typecheck).

### Phase 2: Data and primitives
- [ ] Seeded RNG (`{ seed, cursor }`), with tests for determinism
- [ ] Court Card stat table (HP, ATK dice)
- [ ] Major Arcana codex (HP, ATK, passive id, spell id) for all 22
- [ ] Player Deck and Dungeon Deck builders (Dungeon Deck = 16 Court + 22 Major)
- [ ] Shuffle, draw, and discard-pile reshuffle

**Exit:** same seed always produces the same decks and rolls.

### Phase 3: Engine core
- [ ] Maze generation (rulebook Sections 3-4), with the Entrance Guardian fixed at the origin
- [ ] Turn loop: move, auto-engage, auto-draw, act
- [ ] Combo resolution pipeline (restrict, total with Swords, judge, bonuses, damage, defeat)
- [ ] Suit effects: Wands, Cups, Swords, Pentacles
- [ ] Court Card suit immunity
- [ ] ATK roll, reductions, then Court retaliation effects
- [ ] Defeat a tile: it becomes a Spell; the tile is cleared
- [ ] Burn a Spell; Court Card spells roll ATK on burn
- [ ] Health 0 ends the run; reshuffle rebuilds a smaller, meaner dungeon
- [ ] `legalActions` and `previewCombo`

**Exit:** a plain (Court Cards only) run can be played through by calling `apply`.

### Phase 4: Boss passives and spells
Group by difficulty; every item gets its own test.
- [ ] Simple: Wheel of Fortune, The Sun, Magician, Chariot, Strength
- [ ] Play restrictions: Tower, Hanged Man, High Priestess, Hierophant, Lovers, Temperance
- [ ] Round-based: Empress, Moon (blind plays and the reroll interrupt window)
- [ ] Hand effects: Fool, Emperor
- [ ] Meta: Death, Devil, Judgement, Star, Hermit, Justice (duel mode)
- [ ] The World: gate, campaign win

**Exit:** all 22 Majors pass their tests.

### Phase 5: Headless validation
- [ ] Seeded random-bot plays full campaigns
- [ ] Invariant checks (Health never above 30, no orphaned cards, every run terminates)
- [ ] Run thousands of games in CI
- [ ] Fix whatever it finds

**Exit:** zero invariant violations across the bot batch.

### Phase 6: UI v1 (mobile-first)
- [ ] Card component: code-built frame, badges and text from data, with text-only fallback when no art exists
- [ ] Card text pass for solo wording (Empress, Death, Emperor, Hermit, Star)
- [ ] Spell face for every Major and Court card
- [ ] Combat screen: enemy art, card history, player status, hand, deck and discard
- [ ] Card select pop-out and flip-to-enemy animations
- [ ] Hand and card selection with the Play button
- [ ] Live combo preview (hidden in Moon rounds)
- [ ] Combat panel: tile HP, ATK, active marks and restrictions
- [ ] Spell hand with burn flow, including choice prompts
- [ ] Flat map grid with fog and tile reveal, plus a compact tile card for the map
- [ ] Event queue driving animations, and a game log
- [ ] Run-end and campaign-win screens

**Exit:** a full campaign is playable in the browser.

### Phase 7: Persistence and offline
- [ ] Autosave campaign to IndexedDB after every action
- [ ] Resume on reload, with a version field for save migration
- [ ] PWA manifest, icons, service worker
- [ ] Verify offline: airplane-mode test on a phone

**Exit:** install it, go offline, finish a run, close and reopen with nothing lost.

### Phase 8: Polish
- [ ] In-game rules reference and a short tutorial run
- [ ] Accessibility pass (contrast, tap targets, screen-reader labels, suit never shown by color alone)
- [ ] 2.5D tilted map with billboard enemies (CSS 3D)
- [ ] Foil and shimmer card effects
- [ ] Sound and juice
- [ ] Balance pass using bot statistics
- [ ] Optional: shareable seeds and a daily dungeon

### Later (not v1)
- [ ] Co-op multiplayer (needs an authoritative server for hidden information)
- [ ] Rulebook house-rule toggles

---

## Source of truth

`Dungeon_Arcana_Rulebook_v2_3.docx` is the base ruleset. When this README's **Rule decisions** table disagrees with it, this README wins.
