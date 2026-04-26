# WeirdoWords — Copilot Instructions

## Project Overview

WeirdoWords is a browser-based word-jumble game built with plain HTML, CSS, and vanilla JavaScript (no build step, no frameworks).  Players are shown the letters of a word in a random order and must reassemble them — by typing, clicking, or dragging — before a countdown timer expires.

---

## Repository Layout

| Path | Purpose |
|---|---|
| `game.htm` | Single-page HTML shell; all UI lives here |
| `game.css` | All styles |
| `js/game.js` | All game logic (timers, scoring, tile interaction) |
| `js/words_easy.js` | **The approved word list** — `wordList_Easy` array |
| `js/words_easy_v1.js` | Legacy word list snapshot; kept for reference only |
| `*.wav` | Sound effects (place, correct, wrong, gameover) |
| `.github/workflows/validate.yml` | CI: runs `html-validate` on every push / PR |

---

## Hard Rules — Apply to Every Feature

1. **Approved word list only.**  Any feature that selects, filters, or presents words to the player **must** source those words exclusively from `wordList_Easy` (exported as `const wordList = wordList_Easy` at the top of `game.js`).  Do not introduce a second word array or fetch words from an external source.

2. **No external dependencies.**  The project intentionally ships zero npm runtime dependencies.  Do not add libraries, CDN scripts (other than the existing Google Fonts links), or package managers to support gameplay logic.

3. **No build step.**  Files are served as-is.  Keep everything compatible with modern browsers without transpilation.

4. **Validate HTML.**  After any change to `game.htm` run `npx html-validate game.htm` locally (mirrors the CI check).

---

## Game Configuration Constants (`js/game.js`)

All tunable values are grouped at the top of `game.js` under the *GAME CONFIGURATION* banner.  Prefer adjusting these constants over hard-coding values elsewhere:

| Constant | Default | Meaning |
|---|---|---|
| `maxWords` | `10` | Words per game session |
| `gameTimerMax` | `15000` | Milliseconds allowed per word |
| `gameTimerInterval` | `1000` | Timer tick interval (ms) |
| `gameTimeBonusTicks` | `2` | Extra ticks for a partial-correct guess |
| `points_Correct` | `100` | Points for a correct answer |
| `points_Incorrect` | `-20` | Points deducted per wrong guess |
| `points_Bonus` | `5` | Bonus points per second remaining |
| `showCorrectPos` | `true` | Underline correctly placed letters |

---

## Word-Selection Logic

`GetWord(solved, maxLength, minLength, exceptWords)` in `game.js`:

* Filters `wordList_Easy` by length (`minLength`–`maxLength`).
* Excludes any words already used this session (`exceptWords`).
* Derives a **deterministic seed** from today's date + the word's position number so that all players get the same daily sequence (Wordle-style).

When adding any new game mode, reuse or extend `GetWord` rather than writing a separate selection routine.

---

## Existing Game Modes

| Mode | Status | `gameMode` value |
|---|---|---|
| Timed Daily | ✅ Active | `0` |
| Infinite Play | 🔒 Disabled (button present, `disabled` attribute set) | TBD |

---

## Options for Implementing Infinite Play

The following options all satisfy the hard rule that word selection must stay within `wordList_Easy`.

### Option A — Truly Random, No Repeat Until Exhausted
* Shuffle a copy of the length-filtered word list at session start.
* Iterate through the shuffled copy; re-shuffle when exhausted.
* No seed needed; sequence is different every play.
* Simplest to implement; no server required.

### Option B — Seeded Infinite Sequence
* Extend `GenerateSeed` to accept an incrementing counter rather than a fixed daily date.
* Each new word advances the counter, producing a repeatable but long sequence.
* Allows the player to share/reproduce their run if the seed is exposed in the UI.

### Option C — Daily Rotating Pool
* Keep the daily-seed logic, but lift the 10-word cap (`maxWords`).
* Players may replay the same daily pool as many times as they like.
* Simplest change to the existing code (`gameMode == 1` branch, remove the `isGameOver` check at `solvedWords > maxWords`).

### Option D — Difficulty-Tiered Infinite
* Build on any of the above, but cycle `progression` entries on a loop (or create an extended progression table) so difficulty keeps escalating.
* Word length bounds would increase gradually and then reset.

> **Recommendation:** Option A is the quickest to ship and requires the fewest changes to `game.js`.  Option C is the least risky because it reuses the most existing logic.  Either approach should set `gameMode = 1` for the new mode so existing `gameMode == 0` (Timed Daily) behaviour is untouched.

---

## Coding Conventions

* Match the existing style: `camelCase` functions and variables, 4-space indentation, no semicolons omitted, brief inline comments on non-obvious logic.
* Keep all game logic in `js/game.js`; keep all word data in `js/words_easy.js`.
* Prefer `const` / `let` over `var`.
* Accessibility: new interactive elements must have appropriate `aria-label` or `aria-live` attributes consistent with the existing markup.
