import {
  gameState,
  setMyId,
  updateGameState,
  startGame,
  updateMyHand,
} from "../state/gameState.js";
import { updateRoomInfo } from "../ui/roomUI.js";
import { addChatMessage } from "../ui/chatUI.js";

let isJoiningRoom = false;

export const setupSocketEvents = (socket, gameId, username) => {
  console.log("[Socket Events] Setting up socket events for game:", gameId);
  
  socket.on("connect", () => {
    console.log("[Socket Events] Socket connected");
    if (isJoiningRoom) return;
    isJoiningRoom = true;

    fetch("/api/me")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((userData) => {
        if (!userData || !userData.id) {
          throw new Error("Invalid user data received");
        }
        console.log("[Socket Events] User data received:", userData);
        setMyId(userData.id);
        console.log(`[Socket Events] Connected with user ID: ${gameState.myId}`);

        // Send user ID to server
        socket.emit("setUserId", gameState.myId);

        addChatMessage({
          username: "System",
          message: `Connected as ${username}`,
          type: "system",
        });
        if (gameId) {
          console.log(`[Socket Events] Joining room ${gameId}`);
          socket.emit("joinRoom", {
            roomId: gameId,
            username,
            userId: gameState.myId,
          });
        } else {
          console.error("[Socket Events] Cannot join room: gameId is invalid on connect.");
        }
      })
      .catch((error) => {
        console.error("[Socket Events] Error fetching user data:", error);
        addChatMessage({
          username: "System",
          message: `Error: ${error.message}. Please try logging in again.`,
          type: "system",
        });
        isJoiningRoom = false;
      });
  });

  socket.on("disconnect", (reason) => {
    console.warn(`[Socket Events] Disconnected: ${reason}`);
    isJoiningRoom = false;
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
    if (playerInterval) {
      clearInterval(playerInterval);
      playerInterval = null;
    }
    startGame(data);
  });

  socket.on("updateGameState", (data) => {
    console.log("[Socket Events] Game state update received:", data);
    if (updateGameState(data)) {
      updateGameUI();
    }
  });

  socket.on("updateMyHand", (data) => {
    console.log("[Socket Events] Hand update received:", data);
    updateMyHand(data.hand);
    updateMyHandUI();
  });

  socket.on("cardPlayed", (data) => {
    console.log("[Socket Events] Card played event received:", data);
    handleCardPlayed(data);
  });

  socket.on("cardDrawn", (data) => {
    console.log("[Socket Events] Card drawn event received:", data);
    handleCardDrawn(data);
  });

  socket.on("playerSaidUno", (data) => {
    console.log("[Socket Events] Player said UNO event received:", data);
    handlePlayerSaidUno(data);
  });

  socket.on("gameOver", (data) => {
    console.log("[Socket Events] Game over event received:", data);
    handleGameOver(data);
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
};
