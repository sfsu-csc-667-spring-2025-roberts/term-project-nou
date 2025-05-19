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
  socket.on("connect", () => {
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
        setMyId(userData.id);
        console.log(`Connected with user ID: ${gameState.myId}`);

        // Send user ID to server
        socket.emit("setUserId", gameState.myId);

        addChatMessage({
          username: "System",
          message: `Connected as ${username}`,
          type: "system",
        });
        if (gameId) {
          socket.emit("joinRoom", {
            roomId: gameId,
            username,
            userId: gameState.myId,
          });
        } else {
          console.error("Cannot join room: gameId is invalid on connect.");
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
        addChatMessage({
          username: "System",
          message: `Error: ${error.message}. Please try logging in again.`,
          type: "system",
        });
        isJoiningRoom = false;
      });
  });

  socket.on("disconnect", (reason) => {
    console.warn(`Disconnected: ${reason}`);
    isJoiningRoom = false;
    addChatMessage({
      username: "System",
      message: `Disconnected: ${reason}. Please refresh if connection isn't restored.`,
      type: "system",
    });
  });

  socket.on("connect_error", (error) => {
    console.error("Connection Error:", error);
    addChatMessage({
      username: "System",
      message: `Connection failed: ${error.message}.`,
      type: "system",
    });
  });

  socket.on("roomUpdate", (data) => {
    updateRoomInfo(data);
  });

  socket.on("gameStarted", (data) => {
    if (playerInterval) {
      clearInterval(playerInterval);
      playerInterval = null;
    }
    startGame(data);
  });

  socket.on("updateGameState", (data) => {
    if (updateGameState(data)) {
      updateGameUI();
    }
  });

  socket.on("updateMyHand", (data) => {
    console.log("Received specific hand update:", data);
    updateMyHand(data.hand);
    updateMyHandUI();
  });

  socket.on("cardPlayed", (data) => {
    handleCardPlayed(data);
  });

  socket.on("cardDrawn", (data) => {
    handleCardDrawn(data);
  });

  socket.on("playerSaidUno", (data) => {
    handlePlayerSaidUno(data);
  });

  socket.on("gameOver", (data) => {
    handleGameOver(data);
  });

  socket.on("chatMessage", (data) => {
    addChatMessage(data);
  });

  socket.on("roomError", (data) => {
    console.error("Room Error:", data.message);
    alert(`Error: ${data.message}`);
    if (data.redirect) window.location.href = data.redirect;
  });

  socket.on("playerReady", (data) => {
    const { player, ready } = data;
    const playerName = player.id === gameState.myId ? "You" : player.username;
    addChatMessage({
      username: "System",
      message: `${playerName} is ${ready ? "ready" : "not ready"}`,
      type: "system",
    });
  });

  socket.on("allPlayersReady", () => {
    addChatMessage({
      username: "System",
      message: "All players are ready! The game can start now.",
      type: "system",
      highlight: true,
    });
  });
};
