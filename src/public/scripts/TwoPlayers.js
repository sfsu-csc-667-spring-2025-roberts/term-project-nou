// Game state variables
let currentPlayer = null;
let gameData = {
  myHand: [],
  opponentHandCount: 0,
  topCard: null,
  isMyTurn: false,
  gameStarted: false,
};

// DOM elements
const startGameBtn = document.getElementById("start-game");
const drawCardBtn = document.getElementById("draw-card");
const gameStatus = document.getElementById("game-status");
const playerHand = document.getElementById("player-hand");
const opponentHand = document.getElementById("opponent-hand");
const topCardElement = document.getElementById("top-card");
const turnIndicator = document.getElementById("turn-indicator");
const drawPile = document.getElementById("draw-pile");
const player1Btn = document.getElementById("player1-btn");
const player2Btn = document.getElementById("player2-btn");

// Player selection
function selectPlayer(playerId) {
  currentPlayer = playerId;
  gameStatus.textContent = `You are playing as ${
    playerId === "player1" ? "Player 1" : "Player 2"
  }`;

  // Update button states
  player1Btn.disabled = playerId === "player1";
  player2Btn.disabled = playerId === "player2";
  startGameBtn.disabled = false;

  // Update game state if game is already started
  if (gameData.gameStarted) {
    updateGameState();
  }
}

// Start a new game
startGameBtn.addEventListener("click", () => {
  if (!currentPlayer) {
    gameStatus.textContent = "Please select a player first";
    return;
  }

  fetch("/api/start-game", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        gameStatus.textContent = data.message;
        updateGameState();
      } else {
        gameStatus.textContent = data.message || "Failed to start game";
      }
    })
    .catch((error) => {
      console.error("Error starting game:", error);
      gameStatus.textContent = "Error starting game";
    });
});

// Draw a card
drawCardBtn.addEventListener("click", () => {
  if (!currentPlayer || !gameData.isMyTurn) return;

  fetch("/api/draw-card", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ playerId: currentPlayer }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        gameStatus.textContent = data.message;
        updateGameState();
      } else {
        gameStatus.textContent = data.message || "Failed to draw card";
      }
    })
    .catch((error) => {
      console.error("Error drawing card:", error);
      gameStatus.textContent = "Error drawing card";
    });
});

// Play a card
function playCard(cardIndex) {
  if (!currentPlayer || !gameData.isMyTurn) return;

  fetch("/api/play-card", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ playerId: currentPlayer, cardIndex }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        gameStatus.textContent = data.message;
        if (data.gameOver) {
          drawCardBtn.disabled = true;
        }
        updateGameState();
      } else {
        gameStatus.textContent = data.message || "Failed to play card";
      }
    })
    .catch((error) => {
      console.error("Error playing card:", error);
      gameStatus.textContent = "Error playing card";
    });
}

// Update game state
function updateGameState() {
  if (!currentPlayer) return;

  fetch(`/api/state/${currentPlayer}`)
    .then((response) => response.json())
    .then((data) => {
      gameData = data;
      renderGameState();
    })
    .catch((error) => {
      console.error("Error updating game state:", error);
      gameStatus.textContent = "Error updating game state";
    });
}

// Render game state
function renderGameState() {
  // Clear previous state
  playerHand.innerHTML = "";
  opponentHand.innerHTML = "";
  topCardElement.innerHTML = "";

  // Update turn indicator
  turnIndicator.textContent = gameData.isMyTurn
    ? "Your turn"
    : "Opponent's turn";

  // Update draw button state
  drawCardBtn.disabled = !gameData.isMyTurn || !gameData.gameStarted;

  // Render top card
  if (gameData.topCard) {
    const topCardDiv = createCardElement(gameData.topCard);
    topCardElement.appendChild(topCardDiv);
  }

  // Render player's hand
  gameData.myHand.forEach((card, index) => {
    const cardElement = createCardElement(card);
    cardElement.onclick = () => playCard(index);
    playerHand.appendChild(cardElement);
  });

  // Render opponent's hand (face down)
  for (let i = 0; i < gameData.opponentHandCount; i++) {
    const cardBackElement = document.createElement("div");
    cardBackElement.className = "card card-back";
    cardBackElement.innerHTML = '<span class="card-value">UNO</span>';
    opponentHand.appendChild(cardBackElement);
  }
}

// Create card element
function createCardElement(card) {
  const cardElement = document.createElement("div");
  cardElement.className = `card ${card.color}`;
  cardElement.innerHTML = `<span class="card-value">${card.value}</span>`;
  return cardElement;
}

// Setup polling for game state updates (for demonstration purposes)
// In a real app, you would use WebSockets or Server-Sent Events
setInterval(() => {
  if (currentPlayer && gameData.gameStarted) {
    updateGameState();
  }
}, 2000);

// Initialize
startGameBtn.disabled = true;
drawCardBtn.disabled = true;
