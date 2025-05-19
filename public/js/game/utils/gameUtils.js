import { gameState } from "../state/gameState.js";
import { addChatMessage } from "../ui/chatUI.js";

// Check if the game can be started
export const canStartGame = (players) => {
  return players.length >= gameState.minPlayersRequired;
};

// Check if the game is over
export const isGameOver = (players) => {
  return players.some((player) => player.cardCount === 0);
};

// Get the winner of the game
export const getWinner = (players) => {
  return players.find((player) => player.cardCount === 0);
};

// Calculate the next player's turn
export const getNextPlayer = (currentPlayerId, direction) => {
  const currentIndex = gameState.players.findIndex(
    (p) => p.id === currentPlayerId
  );
  if (currentIndex === -1) return null;

  const nextIndex =
    (currentIndex + direction + gameState.players.length) %
    gameState.players.length;
  return gameState.players[nextIndex];
};

// Check if a player can play a card
export const canPlayCard = (card) => {
  const topCard = gameState.topCard;
  if (!topCard) return true;

  const topColor =
    (topCard.type === "wild" || topCard.type === "wild_draw_four") &&
    topCard.declaredColor
      ? topCard.declaredColor
      : topCard.color;

  if (card.type === "wild" || card.type === "wild_draw_four") return true;
  if (card.color === "black") return false;

  return (
    card.color === topColor ||
    (card.type === "number" &&
      topCard.type === "number" &&
      card.value == topCard.value) ||
    (card.type !== "number" && card.type === topCard.type)
  );
};

// Format a card description for display
export const formatCardDescription = (card) => {
  let cardDesc = "";
  const color = card.declaredColor || card.color;
  const typeDisplay = card.type.replace("_", " ");

  if (card.type === "number") cardDesc = `${color} ${card.value}`;
  else if (card.type === "wild") cardDesc = `Wild (chose ${color})`;
  else if (card.type === "wild_draw_four")
    cardDesc = `Wild Draw Four (chose ${color})`;
  else cardDesc = `${color} ${typeDisplay}`;

  return cardDesc;
};

// Handle game error
export const handleGameError = (error) => {
  console.error("Game error:", error);
  addChatMessage({
    username: "System",
    message: `Error: ${error.message}`,
    type: "system",
  });
};

// Check if a player needs to say UNO
export const needsToSayUno = (playerId) => {
  const player = gameState.players.find((p) => p.id === playerId);
  return player && player.cardCount === 1;
};

// Check if a player has said UNO
export const hasSaidUno = (playerId) => {
  const player = gameState.players.find((p) => p.id === playerId);
  return player && player.saidUno;
};
