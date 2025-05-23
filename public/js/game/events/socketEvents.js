import {
  gameState,
  setMyId,
  updateGameState,
  startGame,
  updateMyHand,
  resetGameState,
} from "../state/gameState.js";
import { updateRoomInfo } from "../ui/roomUI.js";
import { addChatMessage } from "../ui/chatUI.js";
import { updateGameUI } from '../ui/gameUI.js';

let isJoiningRoom = false;

export const setupSocketEvents = (socket, gameId, username) => {
  console.log("[Socket Events] Setting up socket events for game:", gameId);
  
  socket.on("connect", () => {
    console.log("[Socket Events] Connected to server");
    socket.emit("joinGame", { gameId, username });
  });

  socket.on("disconnect", (reason) => {
    console.warn(`[Socket Events] Disconnected: ${reason}`);
    addChatMessage({
      username: "System",
      message: `Disconnected: ${reason}. Please refresh if connection isn't restored.`,
      type: "system",
    });
  });

  socket.on("connect_error", (error) => {
    console.error("[Socket Events] Connection Error:", error);
    addChatMessage({
      username: "System",
      message: `Connection failed: ${error.message}.`,
      type: "system",
    });
  });

  socket.on("roomUpdate", (data) => {
    console.log("[Socket Events] Room update received:", data);
    updateRoomInfo(data);
  });

  socket.on("gameStarted", (data) => {
    console.log("[Socket Events] Game started event received:", data);
    resetGameState();
    if (data.myId) setMyId(data.myId);
    updateGameState(data);
    updateGameUI();
    addChatMessage({
      username: "System",
      message: "Game started! Good luck!",
      type: "system",
    });
  });

  socket.on("updateGameState", (data) => {
    console.log("[Socket Events] Game state update received:", data);
    if (updateGameState(data)) {
      updateGameUI();
    } else {
      console.error("[Socket Events] Failed to update game state");
    }
  });

  socket.on("updateMyHand", (data) => {
    console.log("[Socket Events] Hand update received:", data);
    if (updateMyHand(data.hand)) {
      updateGameUI();
    } else {
      console.error("[Socket Events] Failed to update hand");
    }
  });

  socket.on("cardPlayed", (data) => {
    console.log("[Socket Events] Card played event received:", data);
    const { player, card } = data;
    const playerName = player.id === gameState.myId ? "You" : player.username;
    let cardDesc = formatCardDescription(card);
    addChatMessage({
      username: "System",
      message: `${playerName} played ${cardDesc}`,
      type: "system",
    });
    updateGameUI();
  });

  socket.on("cardDrawn", (data) => {
    console.log("[Socket Events] Card drawn event received:", data);
    const { player, cardCount } = data;
    const playerName = player.id === gameState.myId ? "You" : player.username;
    addChatMessage({
      username: "System",
      message: `${playerName} drew ${cardCount === 1 ? "a card" : cardCount + " cards"}`,
      type: "system",
    });
    updateGameUI();
  });

  socket.on("playerSaidUno", (data) => {
    console.log("[Socket Events] Player said UNO event received:", data);
    const { player } = data;
    const playerName = player.id === gameState.myId ? "You" : player.username;
    addChatMessage({
      username: "System",
      message: `${playerName} shouted UNO!`,
      type: "system",
    });
  });

  socket.on("gameOver", (data) => {
    console.log("[Socket Events] Game over event received:", data);
    const { winner } = data;
    const winnerName = winner.id === gameState.myId ? "You" : winner.username;
    addChatMessage({
      username: "System",
      message: `🎉 Game Over! ${winnerName} won the game! 🎉`,
      type: "system",
      highlight: true,
    });
    updateGameUI();
  });

  socket.on("chatMessage", (data) => {
    console.log("[Socket Events] Chat message received:", data);
    addChatMessage(data);
  });

  socket.on("roomError", (data) => {
    console.error("[Socket Events] Room Error:", data.message);
    alert(`Error: ${data.message}`);
    if (data.redirect) window.location.href = data.redirect;
  });

  socket.on("playerReady", (data) => {
    console.log("[Socket Events] Player ready event received:", data);
    const { player, ready } = data;
    const playerName = player.id === gameState.myId ? "You" : player.username;
    addChatMessage({
      username: "System",
      message: `${playerName} is ${ready ? "ready" : "not ready"}`,
      type: "system",
    });
  });

  socket.on("allPlayersReady", () => {
    console.log("[Socket Events] All players ready event received");
    addChatMessage({
      username: "System",
      message: "All players are ready! The game can start now.",
      type: "system",
      highlight: true,
    });
  });

  socket.on("error", (error) => {
    console.error("[Socket Events] Error received:", error);
    addChatMessage({
      username: "System",
      message: `Error: ${error.message}`,
      type: "system",
    });
  });

  return socket;
};

const formatCardDescription = (card) => {
  let cardDesc = "";
  const color = card.declaredColor || card.color;
  const typeDisplay = card.type.replace("_", " ");

  if (card.type === "number") cardDesc = `${color} ${card.value}`;
  else if (card.type === "wild") cardDesc = `Wild (chose ${color})`;
  else if (card.type === "wild_draw4") cardDesc = `Wild Draw Four (chose ${color})`;
  else cardDesc = `${color} ${typeDisplay}`;
  return cardDesc;
};
