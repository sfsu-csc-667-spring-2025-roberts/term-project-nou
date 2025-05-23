// 游戏状态管理
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

  try {
    gameState.players = data.players || gameState.players;
    gameState.currentPlayer = data.currentPlayer || gameState.currentPlayer;
    gameState.topCard = data.topCard || gameState.topCard;
    gameState.direction = data.direction || gameState.direction;
    gameState.status = data.status || gameState.status;
    gameState.roomId = data.roomId || gameState.roomId;

    console.log("[Game State] Updated state:", {
      players: gameState.players.length,
      currentPlayer: gameState.currentPlayer,
      topCard: gameState.topCard,
      direction: gameState.direction,
      status: gameState.status,
      roomId: gameState.roomId
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
    console.log("[Game State] Hand updated successfully");
    return true;
  } catch (error) {
    console.error("[Game State] Error updating hand:", error);
    return false;
  }
};

export const getCurrentPlayer = () => {
  console.log("[Game State] Getting current player:", gameState.currentPlayer);
  return gameState.currentPlayer;
};

export const isMyTurn = () => {
  const isTurn = gameState.currentPlayer === gameState.myId;
  console.log("[Game State] Checking if it's my turn:", isTurn);
  return isTurn;
};

export const getPlayerById = (id) => {
  console.log("[Game State] Getting player by ID:", id);
  return gameState.players.find(player => player.id === id);
};

export const getPlayerIndex = (id) => {
  console.log("[Game State] Getting player index for ID:", id);
  return gameState.players.findIndex(player => player.id === id);
};

export const getNextPlayer = () => {
  console.log("[Game State] Getting next player");
  const currentIndex = getPlayerIndex(gameState.currentPlayer);
  if (currentIndex === -1) {
    console.error("[Game State] Current player not found in players array");
    return null;
  }

  const nextIndex = (currentIndex + gameState.direction + gameState.players.length) % gameState.players.length;
  console.log("[Game State] Next player index:", nextIndex);
  return gameState.players[nextIndex];
};

export const setMinPlayers = (minPlayers) => {
  gameState.minPlayersRequired = minPlayers;
};
