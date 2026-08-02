// ------------------------- PAGE ELEMENTS -------------------------
const chessboard = document.getElementById("chessboard");
const currentTurn = document.getElementById("current-turn");
const selectedSquareText = document.getElementById("selected-square");
const gameStatus = document.getElementById("game-status");

const startGameBtn = document.getElementById("start-game-btn");
const restartGameBtn = document.getElementById("restart-game-btn");

const startCameraBtn = document.getElementById("start-camera-btn");
const stopCameraBtn = document.getElementById("stop-camera-btn");

const cameraFeed = document.getElementById("camera-feed");
const cameraPlaceholder = document.getElementById("camera-placeholder");
const cameraStatus = document.getElementById("camera-status");
const detectedGesture = document.getElementById("detected-gesture");

const gestureCursor = document.getElementById("gesture-cursor");

const promotionModal = document.getElementById("promotion-modal");
const promotionButtons = document.querySelectorAll(".promotion-btn");
const promotionSymbols = document.querySelectorAll(".promotion-symbol");


// ------------------------- GAME VARIABLES -------------------------

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];

let gameState = {
    started: false,
    pieces: {},
    turn: "White",
    status: "Press Start Game",
    game_over: false
};

let selectedSquare = null;
let lastMove = null;
let pendingPromotion = null;

let gestureInterval = null;
let pinchLocked = false;


// ------------------------- CREATE CHESSBOARD -------------------------

function createChessboard() {

    chessboard.innerHTML = "";

    for (let row = 0; row < 8; row++) {

        const rank = 8 - row;

        for (let column = 0; column < 8; column++) {

            const squareName = `${files[column]}${rank}`;
            const square = document.createElement("div");

            square.classList.add("chess-square");

            if ((row + column) % 2 === 0) {
                square.classList.add("light-square");
            } else {
                square.classList.add("dark-square");
            }

            square.dataset.square = squareName;

            chessboard.appendChild(square);
        }
    }
}


// ------------------------- RENDER GAME STATE -------------------------

function renderGame(state) {

    gameState = state;

    document.querySelectorAll(".chess-square").forEach(square => {

        square.innerHTML = "";

        square.classList.remove(
            "selected-square",
            "last-move-square"
        );

        const squareName = square.dataset.square;
        const piece = state.pieces[squareName];

        if (piece) {

            const pieceElement = document.createElement("span");

            pieceElement.classList.add(
                "piece",
                `${piece.colour}-piece`
            );

            pieceElement.textContent = piece.symbol;

            square.appendChild(pieceElement);
        }

        if (squareName === selectedSquare) {
            square.classList.add("selected-square");
        }

        if (
            lastMove &&
            (
                squareName === lastMove.from ||
                squareName === lastMove.to
            )
        ) {
            square.classList.add("last-move-square");
        }
    });

    currentTurn.textContent = state.turn;
    selectedSquareText.textContent = selectedSquare || "None";
    gameStatus.textContent = state.status;

    if (state.game_over) {
        selectedSquare = null;
        selectedSquareText.textContent = "None";
    }
}


// ------------------------- GET INITIAL STATE -------------------------

async function loadGameState() {

    try {

        const response = await fetch("/api/game/state");
        const state = await response.json();

        renderGame(state);

        restartGameBtn.disabled = !state.started;

    } catch (error) {

        gameStatus.textContent = "Unable to load the game.";

        console.error(error);
    }
}


// ------------------------- START GAME -------------------------

async function startGame() {

    try {

        gameStatus.textContent = "Starting game...";

        const response = await fetch("/api/game/start", {
            method: "POST"
        });

        const result = await response.json();

        selectedSquare = null;
        lastMove = null;
        pendingPromotion = null;

        renderGame(result);

        startGameBtn.disabled = true;
        restartGameBtn.disabled = false;

    } catch (error) {

        gameStatus.textContent = "Unable to start the game.";

        console.error(error);
    }
}


// ------------------------- RESTART GAME -------------------------

async function restartGame() {

    try {

        gameStatus.textContent = "Restarting game...";

        const response = await fetch("/api/game/restart", {
            method: "POST"
        });

        const result = await response.json();

        selectedSquare = null;
        lastMove = null;
        pendingPromotion = null;

        hidePromotionModal();
        renderGame(result);

        startGameBtn.disabled = true;
        restartGameBtn.disabled = false;

    } catch (error) {

        gameStatus.textContent = "Unable to restart the game.";

        console.error(error);
    }
}


// ------------------------- SELECT SQUARE USING GESTURE -------------------------

function selectSquare(squareName) {

    if (!gameState.started) {

        gameStatus.textContent = "Press Start Game first.";

        return;
    }

    if (gameState.game_over) {

        gameStatus.textContent = gameState.status;

        return;
    }

    const piece = gameState.pieces[squareName];

    // Select the starting piece

    if (selectedSquare === null) {

        if (!piece) {

            gameStatus.textContent = "No piece exists on this square.";

            return;
        }

        if (piece.colour !== gameState.turn.toLowerCase()) {

            gameStatus.textContent = `It is ${gameState.turn}'s turn.`;

            return;
        }

        selectedSquare = squareName;

        selectedSquareText.textContent = selectedSquare;

        renderGame(gameState);

        return;
    }

    // Pinching the same square cancels the selection

    if (selectedSquare === squareName) {

        selectedSquare = null;

        selectedSquareText.textContent = "None";
        gameStatus.textContent = `${gameState.turn} to move`;

        renderGame(gameState);

        return;
    }

    // Selecting another piece of the same colour

    if ( piece && piece.colour === gameState.turn.toLowerCase()) {

        selectedSquare = squareName;

        selectedSquareText.textContent = selectedSquare;
        gameStatus.textContent = `${squareName} selected`;

        renderGame(gameState);

        return;
    }

    makeMove(selectedSquare, squareName);
}


// ------------------------- SEND MOVE TO PYTHON -------------------------

async function makeMove(fromSquare, toSquare, promotion = null) {

    try {

        gameStatus.textContent = "Validating move...";

        const response = await fetch("/api/game/move", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                from_square: fromSquare,
                to_square: toSquare,
                promotion: promotion
            })
        });

        const result = await response.json();

        if (result.promotion_required) {

            pendingPromotion = {
                from: fromSquare,
                to: toSquare
            };

            showPromotionModal();

            gameStatus.textContent = result.message;

            return;
        }

        if (!result.success) {

            gameStatus.textContent = result.message;

            return;
        }

        lastMove = result.last_move;
        selectedSquare = null;
        pendingPromotion = null;

        renderGame(result);

    } catch (error) {

        gameStatus.textContent = "Unable to complete the move.";

        console.error(error);
    }
}


// ------------------------- PAWN PROMOTION -------------------------

function showPromotionModal() {

    const isWhite = gameState.turn === "White";

    promotionSymbols.forEach(symbol => {

        symbol.textContent = isWhite
            ? symbol.dataset.white
            : symbol.dataset.black;
    });

    promotionModal.hidden = false;
}


function hidePromotionModal() {

    promotionModal.hidden = true;
}


promotionButtons.forEach(button => {

    button.addEventListener("click", () => {

        if (!pendingPromotion) {
            return;
        }

        const promotionPiece = button.dataset.piece;

        hidePromotionModal();

        makeMove(
            pendingPromotion.from,
            pendingPromotion.to,
            promotionPiece
        );
    });
});


// ------------------------- START CAMERA -------------------------

async function startCamera() {

    try {

        cameraStatus.textContent = "Starting...";

        const response = await fetch("/api/camera/start", {
            method: "POST"
        });

        const result = await response.json();

        if (!result.success) {

            cameraStatus.textContent = "Unable to start";

            gameStatus.textContent = result.message;

            return;
        }

        cameraFeed.src = `/video-feed?time=${Date.now()}`;

        cameraFeed.hidden = false;
        cameraPlaceholder.hidden = true;

        cameraStatus.textContent = "Running";

        startCameraBtn.disabled = true;
        stopCameraBtn.disabled = false;

        startGesturePolling();

    } catch (error) {

        cameraStatus.textContent = "Camera error";

        console.error(error);
    }
}


// ------------------------- STOP CAMERA -------------------------

async function stopCamera() {

    try {

        await fetch("/api/camera/stop", {
            method: "POST"
        });

    } catch (error) {

        console.error(error);
    }

    stopGesturePolling();

    cameraFeed.src = "";
    cameraFeed.hidden = true;
    cameraPlaceholder.hidden = false;

    gestureCursor.style.display = "none";

    cameraStatus.textContent = "Stopped";
    detectedGesture.textContent = "None";

    startCameraBtn.disabled = false;
    stopCameraBtn.disabled = true;
}


// ------------------------- POLL GESTURE DATA -------------------------

function startGesturePolling() {

    stopGesturePolling();

    gestureInterval = setInterval(fetchGestureData, 100);
}


function stopGesturePolling() {

    if (gestureInterval) {

        clearInterval(gestureInterval);

        gestureInterval = null;
    }

    pinchLocked = false;
}


// ------------------------- GET GESTURE FROM PYTHON -------------------------

async function fetchGestureData() {

    try {

        const response = await fetch("/api/gesture");
        const data = await response.json();

        cameraStatus.textContent = data.camera_running
            ? "Running"
            : "Stopped";

        detectedGesture.textContent = data.gesture || "None";

        if (!data.hand_detected) {

            gestureCursor.style.display = "none";
            pinchLocked = false;

            return;
        }

        updateGestureCursor(data.x, data.y);

        if (data.gesture === "PINCH" && !pinchLocked) {

            pinchLocked = true;

            const squareName = coordinatesToSquare(
                data.x,
                data.y
            );

            if (squareName) {
                selectSquare(squareName);
            }
        }

        if (data.gesture !== "PINCH") {
            pinchLocked = false;
        }

    } catch (error) {

        detectedGesture.textContent = "Unavailable";
    }
}


// ------------------------- MOVE VIRTUAL CURSOR -------------------------

function updateGestureCursor(x, y) {

    if (
        typeof x !== "number" ||
        typeof y !== "number"
    ) {
        return;
    }

    const limitedX = Math.max(0, Math.min(1, x));
    const limitedY = Math.max(0, Math.min(1, y));

    gestureCursor.style.left = `${limitedX * 100}%`;
    gestureCursor.style.top = `${limitedY * 100}%`;
    gestureCursor.style.display = "block";
}


// ------------------------- CONVERT COORDINATES TO SQUARE -------------------------

function coordinatesToSquare(x, y) {

    if (
        typeof x !== "number" ||
        typeof y !== "number"
    ) {
        return null;
    }

    const column = Math.min(
        7, Math.max(0, Math.floor(x * 8))
    );

    const row = Math.min(
        7, Math.max(0, Math.floor(y * 8))
    );

    const rank = 8 - row;

    return `${files[column]}${rank}`;
}


// ------------------------- BUTTON EVENTS -------------------------

startGameBtn.addEventListener("click", startGame);

restartGameBtn.addEventListener("click", restartGame);

startCameraBtn.addEventListener("click", startCamera);

stopCameraBtn.addEventListener("click", stopCamera);


// ------------------------- INITIALIZE PAGE -------------------------

createChessboard();
loadGameState();