const wordList = wordList_Easy;
const symMatch = "&checkmark;";
const symNoMatch = "&cross;";
const symValid = "&plus;";
const symMissed = "-";

const GAME_MODE_TIMED = 0;
const GAME_MODE_INFINITE = 1;

// ============================================================
// GAME CONFIGURATION
// Adjust these values to tune gameplay balance and scoring.
// ============================================================
const maxWords = 10;                // Number of words per run
const gameTimerMax = 15000;         // Milliseconds per word
const gameTimerInterval = 1000;     // Timer tick interval (ms)
const gameTimeBonusTicks = 2;       // Extra ticks awarded for a partial correct guess
const points_Correct = 100;         // Points for a correct word
const points_Incorrect = -20;       // Points deducted for an incorrect guess
const points_Bonus = 5;             // Bonus points per second remaining on correct answer
const points_ValidNonTarget = 10;   // Points for a valid word that is not the current target
const points_HintCost = 20;         // Points deducted for each Hint use in Infinite mode
const points_SkipCost = points_Correct; // Points deducted when skipping a word in Infinite mode
const showCorrectPos = true;        // Underline correctly placed letters (set false for hard mode)
const tileMinSize = 28;             // Minimum tile size in px before wrapping is allowed
const tileGapSize = 8;              // Fallback gap size in px for tile fit calculations
const infiniteWordLengthMin = 3;    // Minimum word length for Infinite mode
const infiniteWordLengthMax = 20;   // Maximum word length for Infinite mode
const attemptsMaxStored = 100;      // Keep only the most recent attempts for long infinite runs
// ============================================================

const progression = [
    {mn: 3, mx: 3},
    {mn: 4, mx: 4},
    {mn: 4, mx: 4}, 
    {mn: 4, mx: 5}, 
    {mn: 4, mx: 5}, 
    {mn: 4, mx: 5}, 
    {mn: 4, mx: 5}, 
    {mn: 5, mx: 5}, 
    {mn: 5, mx: 6}, 
    {mn: 6, mx: 10}
];

let documentEventListener_Set = false;

let jumbledCnt;
let solutionCnt;
let wordOfWord;
let msgCnt;
let timerCnt;
let timerCntTxt;
let timerHolderCnt;
let scoreCnt;
let overlayCnt;
let howToPlayOverlayCnt;
let restartBtn;
let hintBtn;
let skipBtn;
let endRunBtn;
let confirmOverlayCnt;
let confirmTitleCnt;
let confirmBodyCnt;
let confirmYesBtn;
let confirmNoBtn;

let gameMode = GAME_MODE_TIMED;
let solvedWords = 0;
let attempts = new Array();
let finWord;
let picked = new Array();
let gameTimer = null;
let gameTimerTicks = 0;
let isGameOver = false;
let volLevel = .5;
let resizeTimer = null;

let dlgConsent = null;
let dlgResetGame = null;

let score = 0;
let wordsSolvedCount = 0;
let totalGuessesCount = 0;
let creditedValidWords = new Set();
let validWordSet = new Set(wordList.map(e => e.toLowerCase()));

let infiniteRunSeedBase = 0;
let infiniteRunCycle = 0;
let hintUsesRemaining = 0;
let pendingConfirmAction = null;

let volSlider = null;
let sound_place = null;
let sound_gameover = null;
let sound_wrong = null;
let sound_correct = null;

function Init()
{
    // Get the jumble holder
    jumbledCnt = document.getElementById("jumbled");

    // Get the solution holder
    solutionCnt = document.getElementById("solutions");

    // Get the Word of Word holder
    wordOfWord = document.getElementById("word_of_word");

    // Get the solution area's message box
    msgCnt = document.getElementById("msg");

    // Get the timer display holder
    timerHolderCnt = document.getElementById("timerHolder");
    timerCnt = document.getElementById("timerbar");
    timerCntTxt = document.getElementById("timerbarTxt");

    overlayCnt = document.getElementById("overlay");
    howToPlayOverlayCnt = document.getElementById("howToPlayOverlay");
    restartBtn = document.getElementById("btnRestart");
    hintBtn = document.getElementById("btnHint");
    skipBtn = document.getElementById("btnSkip");
    endRunBtn = document.getElementById("btnEndRun");

    confirmOverlayCnt = document.getElementById("confirmOverlay");
    confirmTitleCnt = document.getElementById("confirmTitle");
    confirmBodyCnt = document.getElementById("confirmBody");
    confirmYesBtn = document.getElementById("confirmYes");
    confirmNoBtn = document.getElementById("confirmNo");

    volSlider = document.getElementById("volume");

    // Get the score display holder
    scoreCnt = document.getElementById("score");
    UpdateScore(0);

    isGameOver = false;

    gameTimerTicks = gameTimerMax;

    volLevel = parseFloat(volSlider.value);

    SetupSounds();

    if(howToPlayOverlayCnt)
    {
        howToPlayOverlayCnt.addEventListener("click", function(e) {
            if(e.target === howToPlayOverlayCnt)
            {
                HideHowToPlayModal();
            }
        });
    }

    window.addEventListener("resize", function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if(finWord)
            {
                UpdateTileSize(finWord.length);
            }
        }, 100);
    });

    ShowTitleOverlay();

}

function StartGame()
{
    StartRun(GAME_MODE_TIMED);
}

function StartInfinitePlay()
{
    StartRun(GAME_MODE_INFINITE);
}

function IsTimedMode()
{
    return gameMode === GAME_MODE_TIMED;
}

function IsInfiniteMode()
{
    return gameMode === GAME_MODE_INFINITE;
}

function StartRun(mode)
{
    HideHowToPlayModal();

    if(!overlayCnt.classList.contains("hidden"))
    {
        overlayCnt.classList.add("hidden");
    }

    ClearGameTimer();

    gameMode = mode;
    isGameOver = false;
    solvedWords = 0;
    wordsSolvedCount = 0;
    totalGuessesCount = 0;
    score = 0;
    attempts = [];
    picked = [];
    finWord = "";
    creditedValidWords = new Set();
    gameTimerTicks = gameTimerMax;

    if(IsInfiniteMode())
    {
        infiniteRunSeedBase = GenerateInfiniteGameSeed();
        infiniteRunCycle = 0;
    }

    hintUsesRemaining = 0;

    document.getElementById("attempts").innerHTML = "";
    msgCnt.textContent = "";
    SetModeUi();
    SetWordOfWord();
    UpdateScore(0);

    sound_correct.play();

    DoNextWordCheck();
}

function SetModeUi()
{
    if(timerHolderCnt)
    {
        timerHolderCnt.style.display = (IsTimedMode() ? "" : "none");
    }

    if(restartBtn)
    {
        restartBtn.style.display = (IsInfiniteMode() ? "none" : "inline-flex");
    }

    if(hintBtn)
    {
        hintBtn.style.display = (IsInfiniteMode() ? "inline-flex" : "none");
    }

    if(skipBtn)
    {
        skipBtn.style.display = (IsInfiniteMode() ? "inline-flex" : "none");
    }

    if(endRunBtn)
    {
        endRunBtn.style.display = (IsInfiniteMode() ? "inline-flex" : "none");
    }

    UpdateHintButtonState();
}

function SetGameTimer()
{
    if(!IsTimedMode())
    {
        return;
    }

    gameTimer = setInterval(CheckTimer, gameTimerInterval);
}

function CheckTimer()
{
    if(!IsTimedMode())
    {
        return;
    }

    if(isGameOver)
    {
        // Don't keep getting words if game is over
        ClearGameTimer();

        // Show game over
        CreateGameOver();
        ShowGameOver();
        return;
    }
    
    if(gameTimerTicks >= 0)
    {
        // Update timer display
        let timerPercent = (gameTimerTicks / gameTimerMax) * 100;
        timerPercent = Math.max(0, Math.min(100, timerPercent));
        timerCnt.value = timerPercent;
        timerCntTxt.textContent = (gameTimerTicks/gameTimerInterval).toString() + " Seconds";

        // Reduce timer
        gameTimerTicks -= gameTimerInterval;
    }
    else
    {
        DoNextWordCheck();
    }
}

function ClearGameTimer()
{
    if(gameTimer != null)
    {
        clearInterval(gameTimer);
        gameTimer = null;
    }
}

function DoNextWordCheck()
{
    if(IsTimedMode() && attempts != undefined)
    {
        let tmp = attempts.find((e)=>{return e.jumble==solvedWords && e.match == true});
        if(tmp == undefined && solvedWords > 0)
        {
            // Log the fact that the player didn't solve the word before time ended
            attempts.push({jumble: solvedWords, word: `<i>${finWord}</i>`, match: false});
            WriteAttempts();

            sound_wrong.play();

            // Adjust score
            UpdateScore(points_Incorrect);
        }
    }

    if(isGameOver){ return false; }

    if(IsTimedMode())
    {
        // Reset timer
        gameTimerTicks = gameTimerMax;

        // Update timer display
        timerCnt.value = 100;
        timerCntTxt.textContent = (gameTimerMax / gameTimerInterval).toString() + " Seconds";
    }

    // Increase next word count
    solvedWords++;

    // Set new word and log
    SetNextWord();

    if(isGameOver)
    {
        CreateGameOver();
        ShowGameOver();
        return false;
    }

    ClearGameTimer(); // Ensure game timer got cleared

    SetGameTimer(); // Restart game timer (timed mode only)
    
}

function SetNextWord()
{

    if(IsTimedMode() && solvedWords > maxWords)
    {
        isGameOver = true;
        return;
    }

    let minLength = infiniteWordLengthMin;
    let maxLength = infiniteWordLengthMax;

    if(IsTimedMode() && solvedWords <= progression.length)
    {
        minLength = progression[solvedWords-1].mn;
        maxLength = progression[solvedWords-1].mx;
    }

    let availableWords = GetAvailableWords(maxLength, minLength, picked);
    if(availableWords.length === 0)
    {
        if(IsInfiniteMode())
        {
            infiniteRunCycle++;
            picked = [];
            msgCnt.textContent = "All eligible words used. Starting a fresh shuffle.";
            availableWords = GetAvailableWords(maxLength, minLength, picked);
        }
        else
        {
            isGameOver = true;
            return;
        }
    }

    if(availableWords.length === 0)
    {
        isGameOver = true;
        return;
    }

    // Generate the next word jumble
    finWord = GetWord(solvedWords, maxLength, minLength, picked);
    if(!finWord)
    {
        isGameOver = true;
        return;
    }

    // Store words picked for later use
    picked.push(finWord);

    // Reset per-round valid-word score tracking to prevent duplicate credit farming.
    creditedValidWords = new Set();
    
    // Setup tiles for the word
    ResetWord();
}

function ResetTilesAfterWrongGuess()
{
    // After a wrong guess, only keep hint-placed letters on the board.
    ResetTileMatchStyle();

    let placedTiles = solutionCnt.querySelectorAll("div[data-placed='1']");
    placedTiles.forEach(tile => {
        if(tile.dataset.hintplaced != 1)
        {
            ResetTile(tile);
        }
    });
}

function ResetTiles()
{
    UpdateTileSize(finWord.length);

    // Show the word
    PrintWord(finWord);

    // Show new solution row
    GenerateBlankTiles(finWord.length);

    // Setup any necessary event listeners
    SetEvents();

    // Set word of word
    SetWordOfWord();
}

function ResetWord()
{
    ResetTiles();

    if(IsInfiniteMode())
    {
        hintUsesRemaining = Math.floor(finWord.length / 2);
    }
    else
    {
        hintUsesRemaining = 0;
    }

    UpdateHintButtonState();
}

function UpdateTileSize(wordLength)
{
    if(!jumbledCnt || !wordLength || wordLength <= 0)
    {
        return;
    }

    // Reset to media-query defaults so each round starts from the intended base design.
    document.documentElement.style.removeProperty("--tile-size");
    document.documentElement.style.removeProperty("--tile-font-size");

    const rootStyles = getComputedStyle(document.documentElement);
    const baseFontPx = parseFloat(rootStyles.fontSize) || 16;
    const naturalTileRem = parseFloat(rootStyles.getPropertyValue("--tile-size"));
    const naturalFontRem = parseFloat(rootStyles.getPropertyValue("--tile-font-size"));
    const naturalTilePx = naturalTileRem > 0 ? naturalTileRem * baseFontPx : 56;
    const naturalFontPx = naturalFontRem > 0 ? naturalFontRem * baseFontPx : 25.6;
    const fontRatio = naturalTilePx > 0 ? (naturalFontPx / naturalTilePx) : 0.457;

    const containerWidth = jumbledCnt.getBoundingClientRect().width;
    if(containerWidth <= 0)
    {
        return;
    }

    const gap = parseFloat(getComputedStyle(jumbledCnt).gap) || tileGapSize;
    const fitTilePx = (containerWidth - (wordLength - 1) * gap) / wordLength;
    const clampedTilePx = Math.max(tileMinSize, Math.min(naturalTilePx, fitTilePx));
    const scaledFontPx = Math.max(12, clampedTilePx * fontRatio);

    document.documentElement.style.setProperty("--tile-size", `${clampedTilePx}px`);
    document.documentElement.style.setProperty("--tile-font-size", `${scaledFontPx}px`);
}

function SetEvents()
{
    // Set document level event listeners if appropriate
    if(!documentEventListener_Set)
    {
        document.addEventListener("dragstart", function(e) {
            e.dataTransfer.setData("Text", e.target.id);
        });

        document.addEventListener("drag", function(e) {
            // Should we do anything while dragging?
        });

        document.addEventListener("dragenter", function(e) {
            if(e.target.classList.contains("drop_allow") && !isGameOver)
            {
                e.target.classList.add( (e.target.dataset.placed != 1 ? "drag_enter" : "drag_fail") );
            }
        });

        document.addEventListener("dragleave", function(e) {
            if(e.target.classList.contains("drop_allow") && !isGameOver)
            {
                e.target.classList.remove("drag_enter");
                e.target.classList.remove("drag_fail");
            }
        });

        document.addEventListener("dragover", function(e) {
            e.preventDefault();
        });

        document.addEventListener("dragend", function(e) {
            // Should we do anything after dragging is done?
        });

        document.addEventListener("drop", function(e) {
            e.preventDefault();
            
            if(e.target.classList.contains("drop_allow") && e.target.dataset.placed != 1 && !isGameOver)
            {
                let source = document.getElementById(e.dataTransfer.getData("Text"));
                let target = e.target;
                DropTile(target, source);
            }
        });

        // Set Keyboard Events
        document.addEventListener("keyup", function(e){

            if(IsHowToPlayModalOpen())
            {
                if(e.code == "Escape")
                {
                    HideHowToPlayModal();
                }

                return true;
            }

            if(e.code == "Escape")
            {
                return true;
            }

            /*
            if( e.code == "Enter")
            {
                // Reset Word
                ResetWord();
                return true;
            }
            */
            
            
            if( e.code == "Backspace")
            {
                
                // Move character after right most position back to jumble line
                SolutionTile_Backspace();
                return true;
            }

            if( /^[a-zA-Z]+$/.test(e.key) )
            {
                // User typed a letter, move the first letter found if exists.
                JumbleTile_KeyPress(e.key.toLowerCase());
                return true;
            }

        });
    }

    let blankTiles = document.querySelectorAll(".solution > div");
    //let blankTiles = solutionCnt.querySelectorAll("div");
    blankTiles.forEach(e => {
        e.addEventListener("click", function(e) {
            SolutionTile_Click(this)
        });
    });

    let jumbleTiles = jumbledCnt.querySelectorAll(":scope > .letters");
    jumbleTiles.forEach(e => {
        e.addEventListener("click", function(e){
            JumbleTile_Click(this);
        });
    });

    /*
    document.getElementById("gameControlsNextWord").addEventListener("click", function(e){
        NextWord_Click();
    });
    */

    // We don't want to keep setting the event listener on the document.
    if(!documentEventListener_Set){ documentEventListener_Set = true; }
}

function SetWordOfWord()
{
    if(IsInfiniteMode())
    {
        wordOfWord.textContent = `WORDS SOLVED: ${wordsSolvedCount}`;
        return;
    }

    wordOfWord.textContent = `WORD ${solvedWords} OF ${maxWords}`;
}

/*
function NextWord_Click()
{
    if(attempts[attempts.length-1].match == true && solvedWords <= maxWords && solutionCnt.getElementsByClassName("empty_tile").length == 0)
    {
        SetNextWord();
    }
}
*/

function SolutionTile_Click(tile)
{
    if(isGameOver){ return false; }

    // Don't allow removal of hint-placed tiles
    if(tile.dataset.hintplaced == 1)
    {
        return false;
    }
    let lastAttempt = attempts[attempts.length-1];
    if(tile.dataset.placed == 1 && !tile.classList.contains("matched"))
    {
        ResetTileMatchStyle();
        ResetTile(tile);
        msgCnt.textContent = "";      
    }
}

function SolutionTile_Backspace()
{
    if(isGameOver){ return false; }

    let tiles = solutionCnt.querySelectorAll("div > .letters");
    
    if(tiles.length > 0)
    {
        // Find the rightmost tile that is NOT hint-placed
        for(let i = tiles.length - 1; i >= 0; i--)
        {
            if(tiles[i].dataset.hintplaced != 1)
            {
                SolutionTile_Click(tiles[i]);
                return;
            }
        }
    }

}

function JumbleTile_Click(tile)
{
    if(isGameOver){ return false; }

    if(tile.draggable)
    {
        DropTile(GetFirstBlankTile(), tile);
    }
}

function JumbleTile_KeyPress(value)
{
    if(isGameOver){ return false; }

    // Search if the letter passed exists in the jumble list
    let jumbleTiles = jumbledCnt.querySelectorAll(":scope > .letters");
    let foundTile = null;

    for(let i = 0; i < jumbleTiles.length; i++)
    {
        let tile = jumbleTiles[i];
        if(tile.textContent.toLowerCase() == value)
        {
            foundTile = tile;
            break;
        }
    }

    if(foundTile != null){ JumbleTile_Click(foundTile); }
}

function DropTile(target, source)
{
    target.innerHTML = "";
    target.classList.remove("drag_enter");
    target.classList.remove("drag_fail");
    target.classList.add("letters");
    target.classList.remove("empty_tile");
    target.innerHTML = source.innerHTML;
    target.dataset.pid = source.id;
    source.innerHTML = "&nbsp;";
    source.classList.remove("letters");
    source.classList.add("empty_tile");
    source.draggable = false;
    target.dataset.placed = 1;

    sound_place.play();

    let isMatch = MatchCheck();
    if(isMatch > 0){ WriteAttempts(); }
    if(isMatch == 3)
    {
        sound_correct.play();
        wordsSolvedCount++;
        SetWordOfWord();
        if(IsTimedMode())
        {
            UpdateScore(points_Correct + (points_Bonus * (gameTimerTicks / gameTimerInterval)));
        }
        else
        {
            UpdateScore(points_Correct);
        }

        ClearGameTimer();
        setTimeout(DoNextWordCheck, 2000); // Allow the animation to play out
    }
    if(isMatch == 1)
    {
        sound_wrong.play();
        UpdateScore(points_Incorrect);
        setTimeout(ResetTilesAfterWrongGuess, 1000);
    }
    if(isMatch == 2)
    {
        let lastAttempt = attempts[attempts.length-1];
        let validWord = (lastAttempt.word || "").toLowerCase();

        if(validWord.length > 0 && !creditedValidWords.has(validWord))
        {
            creditedValidWords.add(validWord);
            UpdateScore(points_ValidNonTarget);
        }

        setTimeout(ResetTilesAfterWrongGuess, 1000);
    }
}

function ResetTileMatchStyle()
{
    let placedTiles = solutionCnt.querySelectorAll("div[data-placed='1']");
    placedTiles.forEach(e => {
        e.classList.remove("nomatch");
        e.classList.remove("matched");
    });
}

function ResetTile(source)
{
    let target = document.getElementById(source.dataset.pid);
    target.classList.remove("drag_enter");
    target.classList.remove("drag_fail");
    target.classList.add("letters");
    target.classList.remove("empty_tile");
    target.innerHTML = source.innerHTML;
    target.draggable = true;
    source.innerHTML = "&nbsp;";
    source.classList.remove("letters");
    source.classList.add("empty_tile");
    source.dataset.placed = 0;
}

/*
    Checks if there is a word match

    Returns
        0 = Not all tiles placed yet
        1 = All tiles placed but incorrect positions
        2 = All tiles placed and valid word, but not the active target word
        3 = All tiles placed and word matches
*/
function MatchCheck()
{
    let placedTiles = solutionCnt.querySelectorAll("div[data-placed='1']");
    let readyCheck = (placedTiles.length == solutionCnt.querySelectorAll(".solution > div").length);
    
    // Check if all tiles have been placed
    if(!readyCheck){ return 0; }

    let placedWord = "";
    // All tiles placed, see if they are the word we are looking for
    placedTiles.forEach(e => {
        placedWord += e.innerHTML;
        e.classList.remove("nomatch");
        e.classList.remove("matched");
    });

    // Does the word match?
    if(placedWord != finWord)
    {
        let placedWord_Lower = placedWord.toLowerCase();
        if(validWordSet.has(placedWord_Lower))
        {
            attempts.push({jumble: solvedWords, word: placedWord, match: false, validAlt: true});
            return 2;
        }

        let placedWord_Formatted = "";

        placedTiles.forEach( (e, i) =>
        {
            e.classList.add("nomatch");
            placedWord_Formatted += (finWord.substr(i, 1).toLowerCase() == e.innerHTML.toLowerCase() && showCorrectPos ? `<u>${e.innerHTML}</u>` : e.innerHTML);
        });

        attempts.push({jumble: solvedWords, word: placedWord_Formatted, match: false});

        if(IsTimedMode() && placedWord_Formatted.indexOf("<u>") != -1)
        {
            // If they got a letter correct, add a bit more time to guess.
            if((gameTimerTicks * gameTimeBonusTicks) < gameTimerMax)
            {
                gameTimerTicks += gameTimerInterval * gameTimeBonusTicks;
            }
            else
            {
                gameTimerTicks = gameTimerMax;
            }
            
        }

        return 1;
    }

    placedTiles.forEach(e =>
    {
        e.classList.add("matched")
    });

    attempts.push({jumble: solvedWords, word: placedWord, match: true});

    // If we made it here, word matched
    return 3;

}

function WriteAttempts()
{
    let aList = document.getElementById("attempts");
    let lastAttempt = attempts[attempts.length-1];
    let isValidAlt = (lastAttempt.validAlt == true);
    let aClass = (lastAttempt.match == true ? "attempt-matched" : (isValidAlt ? "attempt-valid" : "attempt-nomatch"));
    let aMatch = (lastAttempt.match == true ? symMatch : (isValidAlt ? symValid : symNoMatch));
    let rowHTML = `<div class="attempt-row attempt-${aClass} attempt-new"><span class="attempt-symbol ${aClass}">${aMatch}</span> <span class="attempt-word ${aClass}">${lastAttempt.word.toUpperCase()}</span></div>`;
    totalGuessesCount++;
    aList.innerHTML = rowHTML + aList.innerHTML;

    if(attempts.length > attemptsMaxStored)
    {
        attempts = attempts.slice(attempts.length - attemptsMaxStored);
    }

    while(aList.children.length > attemptsMaxStored)
    {
        aList.removeChild(aList.lastElementChild);
    }

    // set msg text under solution for color impaired players
    msgCnt.textContent = (lastAttempt.match == true ? "MATCH!" : (isValidAlt ? "VALID WORD, FIND THE TARGET!" : "NO MATCH!"));
}

function PrintWord(word)
{
    let tile;
    let maxTry = 100;

    let jumble = word;

    while(word == jumble && maxTry > 0)
    {
        jumble = JumbleWord(word);
        maxTry--; // Ensure we don't get stuck in a loop
    }

    jumbledCnt.innerHTML = "";

    for(let i = 0; i < jumble.length; i++)
    {
        tile = document.createElement("div");
        tile.classList.add("letters", "no_drop_allow");
        tile.textContent = jumble.charAt(i);
        tile.draggable = true;
        tile.id = `letter_${i}`;
        jumbledCnt.appendChild(tile);
    }
}

function JumbleWord(word)
{
    let letters = word.split("");
    
    for(let i = 0; i < letters.length; i++)
    {
        let pos = Math.floor(Math.random() * (i+1));
        let cur = letters[i];

        letters[i] = letters[pos];
        letters[pos] = cur;
    }

    return letters.join("");
}

function GenerateBlankTiles(count)
{
    let solRow = document.createElement("div")
    let tile;

    solRow.id = "solution_1";
    solRow.className = "solution";

    solutionCnt.innerHTML = "";

    for(let i = 1; i <= count; i++)
    {
        tile = document.createElement("div");
        tile.classList.add("empty_tile", "drop_allow");
        tile.innerHTML = "&nbsp;";

        solRow.appendChild(tile);
    }

    solutionCnt.appendChild(solRow);
}

function GetFirstBlankTile()
{
    return solutionCnt.getElementsByClassName("empty_tile drop_allow")[0];
}

function GetWord(solved, maxLength = 8, minLength = 4, exceptWords = null)
{
    let seed;
    let word;

    let wordList_Filtered = GetAvailableWords(maxLength, minLength, exceptWords);
    if(wordList_Filtered.length === 0)
    {
        return null;
    }

    if(IsTimedMode())
    {
        seed = GenerateSeed(solved+1*10);
    }
    else
    {
        seed = GenerateInfiniteSeed(solved+1*10);
    }

    word = Math.floor(mulberry32(seed)() * wordList_Filtered.length );
    return wordList_Filtered[word];
}

function GetAvailableWords(maxLength, minLength, exceptWords = null)
{
    let wordList_Filtered = wordList.filter((e) => { return e.length >= minLength && e.length <= maxLength; });

    if(exceptWords != null)
    {
        wordList_Filtered = wordList_Filtered.filter((e) => { return !exceptWords.includes(e); });
    }

    return wordList_Filtered;
}

function GenerateSeed(seq = 1)
{
    let i = new Date();
    i.setDate(i.getDate());
    i.setHours(0);
    i.setMinutes(0);
    i.setSeconds(0);
    i.setMilliseconds(seq);
    return i.getTime();
}

function GenerateInfiniteGameSeed()
{
    return Date.now();
}

function GenerateInfiniteSeed(seq = 1)
{
    return infiniteRunSeedBase + (infiniteRunCycle * 1000003) + seq;
}

/*
    See https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
*/
function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function CreateGameOver()
{
    let txtBody;
    let stats = AnalyzeAttempts();

    // Update all scores
    // SaveScores();
    
    // TODO: Graph showing by word number of attempts

    txtBody = "<b>Score</b><br/>";
    txtBody += "<span>" + score + "</span>";

    if(IsInfiniteMode())
    {
        let avgGuessesInfinite = (wordsSolvedCount > 0 ? (totalGuessesCount / wordsSolvedCount).toFixed(2) : "0.00");

        txtBody += "<b>Words Solved</b><br/>";
        txtBody += "<span>" + wordsSolvedCount + "</span>";

        txtBody += "<b>Average Guesses</b><br/>";
        txtBody += "<span>" + avgGuessesInfinite + "</span>";

        txtBody += "<b>Total Guesses</b><br/>";
        txtBody += "<span>" + totalGuessesCount + "</span>";

        txtBody += "<br/><div style=\"font-size: 0.9rem; margin-top: 1rem;\">Infinite mode can be played as long as you want. Start another run any time.</div>";
    }
    else
    {
        txtBody += "<b>Average Guesses</b><br/>";
        txtBody += "<span>" + stats[0].avg + "</span>";

        txtBody += "<b>Total Guesses</b><br/>";
        txtBody += "<span>" + stats[0].tot + "</span>";

        txtBody += "<br/><div style=\"font-size: 0.9rem; margin-top: 1rem;\">Feel free to play again however the word selection will be the same until approximately Midnight local time.</div>";
    }

    document.getElementById("gameOverBody").innerHTML = txtBody;
}

function ShowGameOver()
{
    sound_gameover.play();

    let gameOverOverlay = document.getElementById("gameOverOverlay");
    let playAgainBtn = document.getElementById("gameOverPlayAgain");
    let closeBtn = document.getElementById("gameOverClose");

    // Show the overlay
    gameOverOverlay.classList.remove("hidden");

    // Set up button listeners
    playAgainBtn.onclick = function() {
        gameOverOverlay.classList.add("hidden");
        setTimeout(() => { RestartGame(true); }, 300); // Give the overlay time to fade out
    };

    closeBtn.onclick = function() {
        gameOverOverlay.classList.add("hidden");
    };
}

function AnalyzeAttempts()
{
    let numAttempts = new Array();
    let avgAttempts = 0;

    if(IsInfiniteMode())
    {
        let avgInfinite = (wordsSolvedCount > 0 ? (totalGuessesCount / wordsSolvedCount) : 0);
        return [{n: [], tot: totalGuessesCount, avg: avgInfinite}];
    }

    for(let i=1; i<=maxWords; i++)
    {
        let t = attempts.filter(o=>o.jumble==i);
        numAttempts.push({jumble: i, num: t.length});
        avgAttempts += t.length;
    }
   
    return [{n: numAttempts, tot: avgAttempts, avg: avgAttempts / maxWords}];
    
}

function UpdateScore(value)
{
    score += value;
    scoreCnt.innerHTML = `POINTS<br/>${score}`;
}

function UpdateHintButtonState()
{
    if(!hintBtn)
    {
        return;
    }

    if(!IsInfiniteMode())
    {
        hintBtn.disabled = true;
        hintBtn.title = "Use Hint";
        return;
    }

    hintBtn.disabled = isGameOver || hintUsesRemaining <= 0;
    hintBtn.title = `Use Hint (${hintUsesRemaining} left)`;
}

function ShowConfirmModal(title, message, onConfirm)
{
    if(!confirmOverlayCnt || !confirmTitleCnt || !confirmBodyCnt || !confirmYesBtn || !confirmNoBtn)
    {
        return;
    }

    pendingConfirmAction = onConfirm;

    confirmTitleCnt.textContent = title;
    confirmBodyCnt.textContent = message;

    confirmYesBtn.onclick = function() {
        confirmOverlayCnt.classList.add("hidden");

        if(typeof pendingConfirmAction === "function")
        {
            pendingConfirmAction();
        }

        pendingConfirmAction = null;
    };

    confirmNoBtn.onclick = function() {
        confirmOverlayCnt.classList.add("hidden");
        pendingConfirmAction = null;
    };

    confirmOverlayCnt.classList.remove("hidden");
}

function UseHint()
{
    if(!IsInfiniteMode() || isGameOver || hintUsesRemaining <= 0)
    {
        return;
    }

    let blankTiles = solutionCnt.querySelectorAll(".empty_tile.drop_allow");
    if(blankTiles.length === 0)
    {
        return;
    }

    let randomIndex = Math.floor(Math.random() * blankTiles.length);
    let targetTile = blankTiles[randomIndex];
    let tileIndex = Array.prototype.indexOf.call(targetTile.parentNode.children, targetTile);

    if(tileIndex < 0 || tileIndex >= finWord.length)
    {
        return;
    }

    let neededChar = finWord.charAt(tileIndex).toLowerCase();
    let sourceTiles = jumbledCnt.querySelectorAll(":scope > .letters");
    let sourceTile = null;

    for(let i = 0; i < sourceTiles.length; i++)
    {
        if(sourceTiles[i].textContent.toLowerCase() === neededChar)
        {
            sourceTile = sourceTiles[i];
            break;
        }
    }

    if(sourceTile == null)
    {
        return;
    }

    hintUsesRemaining--;
    UpdateScore(points_HintCost * -1);
    DropTile(targetTile, sourceTile);
    targetTile.dataset.hintplaced = 1;  // Mark as hint-placed, cannot be removed
    UpdateHintButtonState();
}

function UseSkip()
{
    if(!IsInfiniteMode() || isGameOver)
    {
        return;
    }

    let blankTiles = solutionCnt.querySelectorAll(".empty_tile.drop_allow");
    if(blankTiles.length === 0)
    {
        return;
    }

    attempts.push({jumble: solvedWords, word: `${finWord} (skipped)`, match: false});
    WriteAttempts();
    UpdateScore(points_SkipCost * -1);

    ClearGameTimer();
    setTimeout(DoNextWordCheck, 150);
}

function RestartGame(forceRestart = false)
{
    if(forceRestart || (IsTimedMode() && isGameOver))
    {
        location.reload();
        return;
    }

    ShowConfirmModal("Restart Run", "Restart this run and lose your current progress?", function() {
        location.reload();
    });
}

function EndRun(forceEnd = false)
{
    if(!IsInfiniteMode() || isGameOver)
    {
        return;
    }

    if(forceEnd)
    {
        isGameOver = true;
        ClearGameTimer();
        CreateGameOver();
        ShowGameOver();
        return;
    }

    ShowConfirmModal("End Infinite Run", "End this run and view your results now?", function() {
        EndRun(true);
    });
}

function ShowTitleOverlay()
{

    document.getElementById("pointsCorrect").textContent = points_Correct;
    document.getElementById("pointsCorrectInfinite").textContent = points_Correct;
    document.getElementById("pointsIncorrect").textContent = points_Incorrect * -1;
    document.getElementById("pointsIncorrectInfinite").textContent = points_Incorrect * -1;
    document.getElementById("pointsBonus").textContent = points_Bonus;
    document.getElementById("pointsValidNonTarget").textContent = points_ValidNonTarget;
    document.getElementById("pointsValidNonTargetInfinite").textContent = points_ValidNonTarget;
    document.getElementById("pointsHintCost").textContent = points_HintCost;
    document.getElementById("pointsSkipCost").textContent = points_SkipCost;
    document.getElementById("timerSeconds").textContent = gameTimerMax / 1000;
    document.getElementById("bonusSeconds").textContent = (gameTimerInterval * gameTimeBonusTicks) / gameTimerInterval;
    document.getElementById("bonusSecondsMax").textContent = gameTimerMax / gameTimerInterval;

    overlayCnt.classList.remove("hidden");
}

function IsHowToPlayModalOpen()
{
    return howToPlayOverlayCnt && !howToPlayOverlayCnt.classList.contains("hidden");
}

function ShowHowToPlayModal()
{
    if(!howToPlayOverlayCnt)
    {
        return;
    }

    howToPlayOverlayCnt.classList.remove("hidden");
}

function HideHowToPlayModal()
{
    if(!howToPlayOverlayCnt)
    {
        return;
    }

    howToPlayOverlayCnt.classList.add("hidden");
}

function ChangeVolume()
{
    volLevel = parseFloat(volSlider.value);
    sound_gameover.play();
}

/*
	setup all sounds used in the game
*/
function SetupSounds()
{
	sound_place = new Sound("place.wav", volLevel);
	sound_gameover = new Sound("gameover.wav", volLevel);
    sound_wrong = new Sound("wrong.wav", volLevel);
    sound_correct = new Sound("correct.wav", volLevel);
}

/*
	Creates a new sound and pre-loads it.  Returns a sound object that can be used to start/stop a sound during game play
	Largely Taken from https://www.w3schools.com/graphics/tryit.asp?filename=trygame_sound
	Easy of use, no reason to reinvent wheel
*/
function Sound(source, vol, loop = false)
{
	this.sound = document.createElement("audio");
	this.sound.src = source;
	this.sound.setAttribute("preload", "auto");
	this.sound.setAttribute("controls", "none");
	this.sound.style.display = "none";
	this.sound.volume = vol;
	this.sound.loop = loop;
	document.body.appendChild(this.sound);
	this.paused = this.sound.paused;
	this.play = function(){
        if(volLevel > 0 && this.sound.paused){ this.sound.currentTime = 0; this.sound.volume = volLevel; this.sound.play(); }
	}
	this.stop = function(){
		this.sound.pause();
		this.sound.currentTime = 0;
	}
}