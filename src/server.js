const express = require("express");
const http = require("http");
const path = require("path");
const app = express();
const port = 3000;

// Serve static files
app.use(express.static("client"));
app.use(express.json());

// Game state
const gameState = {
  deck: [],
  discardPile: [],
  players: [
    { id: "player1", name: "Player 1", hand: [], isMyTurn: true },
    { id: "player2", name: "Player 2", hand: [], isMyTurn: false },
  ],
  currentPlayer: 0, // 0 = player1, 1 = player2
  direction: 1, // 1 = normal, -1 = reversed
  gameStarted: false,
};

// Card colors and values
const colors = ["red", "blue", "green", "yellow"];
const values = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "skip",
  "reverse",
  "draw2",
];

// Initialize the deck
function initializeDeck() {
  const deck = [];

  // Add colored cards
  for (let color of colors) {
    // One zero card per color
    deck.push({ color, value: "0" });

    // Two of each non-zero card per color
    for (let i = 0; i < 2; i++) {
      for (let value of values.slice(1)) {
        deck.push({ color, value });
      }
    }
  }

  return shuffle(deck);
}

// Shuffle the deck
function shuffle(array) {
  let currentIndex = array.length;
  let randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

// Deal cards to players
function dealCards() {
  // Each player gets 7 cards
  for (let i = 0; i < 7; i++) {
    for (let player of gameState.players) {
      player.hand.push(gameState.deck.pop());
    }
  }

  // First card for discard pile
  gameState.discardPile.push(gameState.deck.pop());
}

// Start a new game
function startNewGame() {
  gameState.deck = initializeDeck();
  gameState.discardPile = [];
  gameState.players[0].hand = [];
  gameState.players[1].hand = [];
  gameState.currentPlayer = 0;
  gameState.direction = 1;
  gameState.gameStarted = true;

  dealCards();

  // Handle special cards at the start
  const topCard = gameState.discardPile[0];
  if (topCard.value === "skip") {
    gameState.currentPlayer = 1;
    gameState.players[0].isMyTurn = false;
    gameState.players[1].isMyTurn = true;
  } else if (topCard.value === "reverse") {
    gameState.direction = -1;
    gameState.currentPlayer = 1;
    gameState.players[0].isMyTurn = false;
    gameState.players[1].isMyTurn = true;
  } else if (topCard.value === "draw2") {
    gameState.players[gameState.currentPlayer].hand.push(
      ...gameState.deck.splice(0, 2)
    );
    switchPlayer();
  }
}

// Check if a card can be played
function canPlayCard(card) {
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  return card.color === topCard.color || card.value === topCard.value;
}

// Switch to the next player
function switchPlayer() {
  gameState.currentPlayer =
    (gameState.currentPlayer + gameState.direction + 2) % 2;
  gameState.players[0].isMyTurn = gameState.currentPlayer === 0;
  gameState.players[1].isMyTurn = gameState.currentPlayer === 1;
}

// Play a card
function playCard(playerId, cardIndex) {
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

  if (playerIndex !== gameState.currentPlayer) {
    return { success: false, message: "Not your turn!" };
  }

  const player = gameState.players[playerIndex];
  const card = player.hand[cardIndex];

  if (!canPlayCard(card)) {
    return { success: false, message: "Cannot play this card!" };
  }

  // Remove card from hand and add to discard pile
  const playedCard = player.hand.splice(cardIndex, 1)[0];
  gameState.discardPile.push(playedCard);

  // Check for UNO
  if (player.hand.length === 1) {
    return {
      success: true,
      message: "UNO!",
      nextPlayer:
        gameState.players[(playerIndex + gameState.direction + 2) % 2].id,
    };
  }

  // Check for win
  if (player.hand.length === 0) {
    gameState.gameStarted = false;
    return {
      success: true,
      message: `${player.name} wins!`,
      gameOver: true,
    };
  }

  // Handle special cards
  if (playedCard.value === "skip") {
    switchPlayer();
    return {
      success: true,
      message: "Turn skipped!",
      nextPlayer: gameState.players[gameState.currentPlayer].id,
    };
  } else if (playedCard.value === "reverse") {
    gameState.direction *= -1;
    switchPlayer();
    return {
      success: true,
      message: "Direction reversed!",
      nextPlayer: gameState.players[gameState.currentPlayer].id,
    };
  } else if (playedCard.value === "draw2") {
    switchPlayer();
    const nextPlayer = gameState.players[gameState.currentPlayer];
    nextPlayer.hand.push(...gameState.deck.splice(0, 2));
    switchPlayer();
    return {
      success: true,
      message: `${nextPlayer.name} draws 2 cards!`,
      nextPlayer: gameState.players[gameState.currentPlayer].id,
    };
  }

  // Regular card
  switchPlayer();
  return {
    success: true,
    message: "Card played!",
    nextPlayer: gameState.players[gameState.currentPlayer].id,
  };
}

// Draw a card
function drawCard(playerId) {
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId);

  if (playerIndex !== gameState.currentPlayer) {
    return { success: false, message: "Not your turn!" };
  }

  // If deck is empty, reuse discard pile except the top card
  if (gameState.deck.length === 0) {
    const topCard = gameState.discardPile.pop();
    gameState.deck = shuffle(gameState.discardPile);
    gameState.discardPile = [topCard];
  }

  const player = gameState.players[playerIndex];
  const drawnCard = gameState.deck.pop();
  player.hand.push(drawnCard);

  // Check if drawn card can be played
  if (canPlayCard(drawnCard)) {
    return {
      success: true,
      message: "Card drawn! You can play it if you want.",
      canPlayDrawnCard: true,
    };
  } else {
    switchPlayer();
    return {
      success: true,
      message: "Card drawn! Your turn ends.",
      nextPlayer: gameState.players[gameState.currentPlayer].id,
    };
  }
}

// Get player state with hidden opponent cards
function getPlayerState(playerId) {
  const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
  const opponentIndex = (playerIndex + 1) % 2;

  return {
    myHand: gameState.players[playerIndex].hand,
    opponentHandCount: gameState.players[opponentIndex].hand.length,
    topCard: gameState.discardPile[gameState.discardPile.length - 1],
    isMyTurn: gameState.players[playerIndex].isMyTurn,
    gameStarted: gameState.gameStarted,
  };
}

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "index.html"));
});

app.get("/twoplayers", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "TwoPlayers.html"));
});

app.post("/api/start-game", (req, res) => {
  startNewGame();
  res.json({ success: true, message: "Game started!" });
});

app.get("/api/state/:playerId", (req, res) => {
  const playerId = req.params.playerId;
  res.json(getPlayerState(playerId));
});

app.post("/api/play-card", (req, res) => {
  const { playerId, cardIndex } = req.body;
  const result = playCard(playerId, cardIndex);
  res.json(result);
});

app.post("/api/draw-card", (req, res) => {
  const { playerId } = req.body;
  const result = drawCard(playerId);
  res.json(result);
});

// Start the server
app.listen(port, () => {
  console.log(`UNO Game server running at http://localhost:${port}`);
});
