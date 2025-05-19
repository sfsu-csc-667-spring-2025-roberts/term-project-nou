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
};

export const setMyId = (id) => {
  gameState.myId = id;
};

export const updateGameState = (data) => {
  if (!gameState.gameStarted) {
    console.warn("Received game state update but game hasn't started locally.");
    return false;
  }

  gameState.players = data.players || gameState.players;
  gameState.currentPlayer = data.currentPlayer;
  gameState.direction = data.direction;
  gameState.topCard = data.topCard;
  gameState.myTurn = data.currentPlayer === gameState.myId;

  const me = gameState.players.find((p) => p.id === gameState.myId);
  if (me && me.hand) {
    console.log("Updating my hand from full game state update.");
    gameState.myHand = me.hand;
  }

  return true;
};

export const startGame = (data) => {
  gameState.players = data.players || [];
  gameState.currentPlayer = data.currentPlayer;
  gameState.topCard = data.topCard;
  gameState.myHand = data.myHand || [];
  gameState.direction = data.direction || 1;
  gameState.gameStarted = true;
  gameState.myTurn = data.currentPlayer === gameState.myId;
};

export const updateMyHand = (hand) => {
  gameState.myHand = hand || [];
};

export const setMinPlayers = (minPlayers) => {
  gameState.minPlayersRequired = minPlayers;
};
