const wordList = wordList_Easy;
const symMatch = "&checkmark;";
const symNoMatch = "&cross;";
const symMissed = "-";
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
let scoreCnt;
let overlayCnt;

let gameMode = 0; // Timed words; Infinite Play?  Other modes in future?  Limit to a day key similar to Wordle?
let solvedWords = 0;
let maxWords = 10;
let attempts = new Array();
let finWord;
let picked = new Array();
let showCorrectPos = true;  // Maybe a hard mode that doesn't show you correctly placed letters/
let gameTimer = null;
let gameTimerTicks = 0;
let gameTimerMax = 10000; // Milliseconds
let gameTimerInterval = 1000;
let gameTimeBonusTicks = 2;
let isGameOver = false;
let volLevel = .5;

let dlgConsent = null;
let dlgGameOver = null;
let dlgResetGame = null;

let score = 0;
let points_Correct = 100;
let points_Incorrect = -20;
let points_Bonus = 5;

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
    timerCnt = document.getElementById("timerbar");
    timerCntTxt = document.getElementById("timerbarTxt");

    overlayCnt = document.getElementById("overlay");

    volSlider = document.getElementById("volume");

    // Get the score display holder
    scoreCnt = document.getElementById("score");
    UpdateScore(0);

    isGameOver = false;

    gameTimerTicks = gameTimerMax;

    volLevel = parseFloat(volSlider.value);

    SetupSounds();

    ShowTitleOverlay();

}

function StartGame()
{
    if(!overlayCnt.classList.contains("hidden"))
    {
        overlay.classList.add("hidden");
    }

    sound_correct.play();

    DoNextWordCheck();
}

function SetGameTimer()
{
    gameTimer = setInterval(CheckTimer, gameTimerInterval);
}

function CheckTimer()
{
    if(isGameOver)
    {
        // Don't keep getting words if game is over
        ClearGameTimer();

        // Show game over
        CreateGameOver();
        let result = ShowGameOver();
    }
    
    if(gameTimerTicks >= 0)
    {
        // Update timer display
        timerCnt.style.width = (10 * (gameTimerTicks/gameTimerInterval)).toString() + "%";
        timerCntTxt.innerHTML = (gameTimerTicks/gameTimerInterval).toString() + " Seconds";

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
    clearInterval(gameTimer);
}

function DoNextWordCheck()
{
    if(attempts != undefined)
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

    // Reset timer
    gameTimerTicks = gameTimerMax;

    // Update timer display
    timerCnt.style.width = "100%";
    timerCntTxt.innerHTML = (gameTimerMax / gameTimerInterval).toString() + " Seconds";

    // Increase next word count
    solvedWords++;

    // Set new word and log
    SetNextWord();

    ClearGameTimer(); // Ensure game timer got cleared

    SetGameTimer(); // Restart game timer
    
}

function SetNextWord()
{

    if(solvedWords > maxWords)
    {
        isGameOver = true;
        return;
    }

    let minLength = 4;
    let maxLength = 10;

    if(gameMode == 0 && solvedWords <= progression.length)
    {
        minLength = progression[solvedWords-1].mn;
        maxLength = progression[solvedWords-1].mx;
    }

    // Generate the next word jumble
    finWord = GetWord(solvedWords, maxLength, minLength, picked);

    // Store words picked for later use
    picked.push(finWord);
    
    // Setup tiles for the word
    ResetWord();
}

function ResetWord()
{
    // Show the word
    PrintWord(finWord);

    // Show new solution row
    GenerateBlankTiles(finWord.length);

    // Setup any necessary event listeners
    SetEvents();

    // Set word of word
    SetWordOfWord();
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

    let jumbleTiles = jumbledCnt.querySelectorAll("div > .letters");
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
    wordOfWord.innerHTML = `WORD ${solvedWords} OF ${maxWords}`;
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

    let lastAttempt = attempts[attempts.length-1];
    if(tile.dataset.placed == 1 && !tile.classList.contains("matched"))
    {
        ResetTileMatchStyle();
        ResetTile(tile);
        msgCnt.innerHTML = "";      
    }
}

function SolutionTile_Backspace()
{
    if(isGameOver){ return false; }

    let tiles = solutionCnt.querySelectorAll("div > .letters");
    
    if(tiles.length > 0)
    {
        let rightMostTile = tiles[tiles.length-1];
        SolutionTile_Click(rightMostTile);
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
    let jumbleTiles = jumbledCnt.querySelectorAll("div > .letters");
    let foundTile = null;

    for(let i = 0; i < jumbleTiles.length; i++)
    {
        let tile = jumbleTiles[i];
        if(tile.innerHTML.toLowerCase() == value)
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
        UpdateScore(points_Correct + (points_Bonus * (gameTimerTicks / gameTimerInterval)));
        ClearGameTimer();
        setTimeout(DoNextWordCheck, 2000); // Allow the animation to play out
    }
    if(isMatch == 1)
    {
        sound_wrong.play();
        UpdateScore(points_Incorrect);
        setTimeout(ResetWord, 1000);
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
        let placedWord_Formatted = "";

        placedTiles.forEach( (e, i) =>
        {
            e.classList.add("nomatch");
            placedWord_Formatted += (finWord.substr(i, 1).toLowerCase() == e.innerHTML.toLowerCase() && showCorrectPos ? `<u>${e.innerHTML}</u>` : e.innerHTML);
        });

        attempts.push({jumble: solvedWords, word: placedWord_Formatted, match: false});

        if(placedWord_Formatted.indexOf("<u>") != -1)
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
    let aClass = (lastAttempt.match == true ? "attempt-matched" : "attempt-nomatch");
    let aMatch = (lastAttempt.match == true ? symMatch : symNoMatch);
    aList.innerHTML = `<span class="${aClass}">${aMatch}  ${lastAttempt.word.toUpperCase()}</span><br/>` + aList.innerHTML;

    // set msg text under solution for color impaired players
    msgCnt.innerHTML = (lastAttempt.match == true ? "MATCH!" : "NO MATCH!");
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
        tile.innerHTML = jumble.charAt(i);
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

    let wordList_Filtered = wordList.filter( (e) => { return e.length >= minLength && e.length <= maxLength } );

    if(exceptWords != null)
    {
        wordList_Filtered = wordList_Filtered.filter( (e) => { return !exceptWords.includes(e) } );
    }

    seed = GenerateSeed(solved+1*10);
    word = Math.floor(mulberry32(seed)() * wordList_Filtered.length );
    return wordList_Filtered[word];
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

    txtBody = "<div style=\"text-align: center; margin-top: 1rem;\">";

        txtBody += "<b>Score</b><br/>";
        txtBody += "<span style=\"color: #29b000; font-weight: bold; font-size: 1.5rem;\">" + score + "</span><br/><br/>";

        txtBody += "<b>Average Guesses</b><br/>";
        txtBody += "<span style=\"color: #29b000; font-weight: bold; font-size: 1.5rem;\">" + stats[0].avg + "</span><br/><br/>";

        txtBody += "<b>Total Guesses</b><br/>";
        txtBody += "<span style=\"color: #29b000; font-weight: bold; font-size: 1.5rem;\">" + stats[0].tot + "</span><br/><br/>";

        txtBody += "<br/>Feel free to play again however the word selection will be the same until approximately Midnight local time."

    txtBody += "</div>";

    let params = {
        textTitle: "Game Over",
        textBody: txtBody,
        dialogFontSize: "1rem",
        dialogWidth: "25%",
        dialogHeight: "45%",
        showAnswerCancel: false,
        showAnswerFalse: true,
        textAnswerTrue: "Play Again",
        textAnswerFalse: "Close"
    }

    dlgGameOver = new spDialog(params);
    dlgGameOver.dialogTitle.style.height = "7%";
    dlgGameOver.dialogBody.style.height = "73%";
    dlgGameOver.answerTrue.style.fontSize = "1.25rem";
    dlgGameOver.answerFalse.style.fontSize = "1.25rem";
    dlgGameOver.dialogTitle.style.fontSize = "1.25rem";
}

async function ShowGameOver()
{
    sound_gameover.play();
    await dlgGameOver.ShowDialog().then(result => {
        if(dlgGameOver.userResponse == 1)
        {
            setTimeout(()=>{RestartGame()}, 500); // Give the dialog a chance to close to avoid weird flashing.
        }
    });
}

function AnalyzeAttempts()
{
    let numAttempts = new Array();
    let avgAttempts = 0;

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

function RestartGame()
{
    // TODO: A true restart that allows you to play a new set of words
    location.reload();
}

function ShowTitleOverlay()
{

    document.getElementById("pointsCorrect").innerHTML = points_Correct;
    document.getElementById("pointsIncorrect").innerHTML = points_Incorrect * -1;
    document.getElementById("pointsBonus").innerHTML = points_Bonus;
    document.getElementById("bonusSeconds").innerHTML = (gameTimerInterval * gameTimeBonusTicks) / gameTimerInterval;
    document.getElementById("bonusSecondsMax").innerHTML = gameTimerMax / gameTimerInterval;

    overlayCnt.classList.remove("hidden");
}

function ChangeVolume()
{
    console.log(volLevel);
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