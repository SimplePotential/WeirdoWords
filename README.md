# WeirdoWords

WeirdoWords is a lightweight web-based word puzzle game where players must identify the correct word based on scrambled or obscured inputs. The project is designed to be simple, fast, and accessible directly in the browser.

## Features

* **Browser-Based Gameplay:** No installation required; runs entirely using standard web technologies.
* **Massive Word List:** Nearly 10,000 words for the game to choose from.
* **Timed Daily Mode:** Currently has one active game mode for a timed daily challenge where everyone has the same list every day.

## Future Development

This project is currently in a stable state, with a major update planned in the near future to expand game modes and enhance the visual experience.

* **Planned Endless Mode:** Where the player will get a randomly generated list of words that they can play indefinately.
* **Planned Easy & Hard Mode:** Still defining how modes will work but likely to have timed and untimed mode.  Limited attempts are also possible.
* **Planned Enhancements:** More features planned but nothing to announce yet.

## LICENSE

Creative Commons Attribution-NonCommercial 4.0 International Public License

Copyright (c) 2026 [Kasey Sheffler]

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

## CONTACT

Questions?  Contact admin@SimplePotential.com.

## Project Review Suggestions

1. **Improve link security in `game.htm`**  
   External links currently use `target="_blank"` without `rel="noopener noreferrer"`. Adding that `rel` helps prevent tab-nabbing.

2. **Add a lightweight automated check step**  
   Since this is a plain HTML/CSS/JS project, adding a small CI workflow (for example, HTML/JS syntax validation) would help catch accidental regressions early.

3. **Increase accessibility support**  
   Add keyboard-focus states and ARIA labels to key controls so gameplay and navigation are clearer for assistive technology and keyboard-only users.

4. **Reduce `innerHTML` usage where possible**  
   Prefer `textContent` when inserting plain text (for score/messages/labels). This reduces XSS risk if content sources change in the future.

5. **Document game balancing constants**  
   Values like timer limits and scoring are currently hard-coded in `js/game.js`. Moving these to a small config section with comments would make balancing easier.
