import { gameState } from "../state/gameState.js";

// Get the current player object
export const getCurrentPlayer = () => {
  return gameState.players.find((p) => p.id === gameState.currentPlayer);
};

// Get the current player's username
export const getCurrentPlayerName = () => {
  const currentPlayer = getCurrentPlayer();
  if (!currentPlayer) return "Unknown";
  return currentPlayer.id === gameState.myId ? "You" : currentPlayer.username;
};

// Check if a player is the current player
export const isCurrentPlayer = (playerId) => {
  return playerId === gameState.currentPlayer;
};

// Check if a player is the current user
export const isCurrentUser = (playerId) => {
  return playerId === gameState.myId;
};

// Get player name with appropriate formatting
export const getPlayerDisplayName = (player) => {
  if (!player) return "Unknown";
  return isCurrentUser(player.id)
    ? `${player.username} (You)`
    : player.username;
};

// Get player card count
export const getPlayerCardCount = (playerId) => {
  const player = gameState.players.find((p) => p.id === playerId);
  return player ? player.cardCount || 0 : 0;
};

// Check if a player is the game creator
export const isGameCreator = (playerId) => {
  const player = gameState.players.find((p) => p.id === playerId);
  return player ? player.isCreator : false;
};

// Get all other players (excluding current user)
export const getOtherPlayers = () => {
  return gameState.players.filter((p) => p.id !== gameState.myId);
};

// Check if it's the current user's turn
export const isMyTurn = () => {
  return gameState.myTurn;
};
