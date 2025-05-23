// Game state management
export const gameState = {
  players: [],
  currentPlayer: null,
  direction: 1,
  topCard: null,
  myHand: [],
  myTurn: false,
  selectedWildCard: null,
  gameStarted: false,
  myId: null,
  minPlayersRequired: 2,
  status: "waiting",
  roomId: null,
  currentColor: null,
  lastActionTime: null,
  drawPileCount: 0,
  discardPileCount: 0
};

export const setMyId = (id) => {
  console.log("[Game State] Setting my ID:", id);
  gameState.myId = id;
};

export const updateGameState = (data) => {
  console.log("[Game State] Updating game state with data:", data);
  if (!data) {
    console.error("[Game State] No data provided for game state update");
    return false;
  }

  // DEBUG: Log structure of players
  if (data.players) {
    console.log("[DEBUG] data.players structure:", JSON.stringify(data.players, null, 2));
  }

  try {
    // Update players and their hands
    if (data.players) {
      gameState.players = data.players.map(player => ({
        ...player,
        hand: player.hand || [],
        cardCount: player.hand ? player.hand.length : 0
      }));
    }

    // Update current player
    if (data.currentPlayer) {
      gameState.currentPlayer = data.currentPlayer;
      gameState.myTurn = data.currentPlayer === gameState.myId;
    }

    // Update top card
    if (data.topCard) {
      gameState.topCard = data.topCard;
    }

    // Update direction
    if (data.direction) {
      gameState.direction = data.direction === 'clockwise' ? 1 : -1;
    }

    // Update status
    if (data.status) {
      gameState.status = data.status;
    }

    // Update room ID
    if (data.roomId) {
      gameState.roomId = data.roomId;
    }

    // Update current color
    if (data.currentColor) {
      gameState.currentColor = data.currentColor;
    }

    // Update card counts
    if (data.drawPileCount !== undefined) {
      gameState.drawPileCount = data.drawPileCount;
    }
    if (data.discardPileCount !== undefined) {
      gameState.discardPileCount = data.discardPileCount;
    }

    // Update player hands
    if (data.player_hands) {
      const myHand = data.player_hands[gameState.myId];
      if (myHand) {
        gameState.myHand = myHand;
      }
    }

    // Update last action time
    if (data.lastActionTime) {
      gameState.lastActionTime = new Date(data.lastActionTime);
    }

    console.log("[Game State] Updated state:", {
      players: gameState.players.length,
      currentPlayer: gameState.currentPlayer,
      topCard: gameState.topCard,
      direction: gameState.direction,
      status: gameState.status,
      roomId: gameState.roomId,
      myHand: gameState.myHand.length,
      currentColor: gameState.currentColor,
      drawPileCount: gameState.drawPileCount,
      discardPileCount: gameState.discardPileCount,
      lastActionTime: gameState.lastActionTime
    });

    return true;
  } catch (error) {
    console.error("[Game State] Error updating game state:", error);
    return false;
  }
};

export const startGame = (data) => {
  console.log("[Game State] Starting game with data:", data);
  if (!data) {
    console.error("[Game State] No data provided for game start");
    return false;
  }

  try {
    updateGameState(data);
    gameState.gameStarted = true;
    gameState.status = "playing";
    console.log("[Game State] Game started successfully");
    return true;
  } catch (error) {
    console.error("[Game State] Error starting game:", error);
    return false;
  }
};

export const updateMyHand = (hand) => {
  console.log("[Game State] Updating my hand:", hand);
  if (!Array.isArray(hand)) {
    console.error("[Game State] Invalid hand data provided");
    return false;
  }

  try {
    gameState.myHand = hand;
    // Update player's card count in players array
    const myPlayerIndex = gameState.players.findIndex(p => p.id === gameState.myId);
    if (myPlayerIndex !== -1) {
      gameState.players[myPlayerIndex].cardCount = hand.length;
    }
    console.log("[Game State] Hand updated successfully");
    return true;
  } catch (error) {
    console.error("[Game State] Error updating hand:", error);
    return false;
  }
};

export const getCurrentPlayer = () => {
  return gameState.currentPlayer;
};

export const isMyTurn = () => {
  return gameState.currentPlayer === gameState.myId;
};

export const getPlayerById = (id) => {
  return gameState.players.find(player => player.id === id);
};

export const getPlayerIndex = (id) => {
  return gameState.players.findIndex(player => player.id === id);
};

export const getNextPlayer = () => {
  const currentIndex = getPlayerIndex(gameState.currentPlayer);
  if (currentIndex === -1) {
    console.error("[Game State] Current player not found in players array");
    return null;
  }

  const nextIndex = (currentIndex + gameState.direction + gameState.players.length) % gameState.players.length;
  return gameState.players[nextIndex];
};

export const setMinPlayers = (minPlayers) => {
  gameState.minPlayersRequired = minPlayers;
};

export const canPlayCard = (card) => {
  if (!gameState.topCard) return true;
  
  // Wild cards can always be played
  if (card.type === 'wild' || card.type === 'wild_draw4') return true;
  
  // Check color match
  if (card.color === gameState.currentColor) return true;
  
  // Check value match
  if (card.value === gameState.topCard.value) return true;
  
  return false;
};

export const resetGameState = () => {
  gameState.players = [];
  gameState.currentPlayer = null;
  gameState.direction = 1;
  gameState.topCard = null;
  gameState.myHand = [];
  gameState.myTurn = false;
  gameState.selectedWildCard = null;
  gameState.gameStarted = false;
  gameState.status = "waiting";
  gameState.currentColor = null;
  gameState.lastActionTime = null;
  gameState.drawPileCount = 0;
  gameState.discardPileCount = 0;
};
