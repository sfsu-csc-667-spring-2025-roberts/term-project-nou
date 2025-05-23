/**
 * Waiting Room Page JavaScript
 * Handles real-time communication and UI updates for the game waiting room
 */
document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const elements = {
    waitingPlayers: document.getElementById("waiting-players"),
    maxPlayers: document.getElementById("max-players"),
    currentPlayers: document.getElementById("current-players"),
    chatMessages: document.getElementById("chat-messages"),
    chatMessageInput: document.getElementById("chat-message"),
    sendMessageButton: document.getElementById("send-message"),
    toggleChatButton: document.getElementById("toggleChat"),
    readyButton: document.getElementById("ready-button"),
    readyStatus: document.getElementById("ready-status"),
    leaveRoom: document.getElementById("leave-room"),
    startGame: document.getElementById("start-game"),
  };

  // Debug logs
  console.log("Start game button:", elements.startGame);

  // Validate required elements
  if (!elements.waitingPlayers || !elements.chatMessages) {
    console.error("Required elements not found!");
    return;
  }

  // Get room and user information from the page
  const container = document.querySelector(".waiting-container");
  const userInfo = {
    userId: container.dataset.userId,
    username: container.dataset.username,
    roomId: container.dataset.roomId,
    isOwner: container.dataset.isOwner === "true",
  };

  // Initialize Socket.IO connection
  const socket = io({
    transports: ["websocket"],
    upgrade: false,
  });

  // Chat UI Functions
  const chatUI = {
    addSystemMessage: (message) => {
      const messageDiv = document.createElement("div");
      messageDiv.className = "chat-message system";
      messageDiv.textContent = message;
      elements.chatMessages.appendChild(messageDiv);
      elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    },

    addChatMessage: (message, isCurrentUser = false) => {
      const messageDiv = document.createElement("div");
      messageDiv.className = `chat-message ${isCurrentUser ? "user" : "other"}`;

      const usernameSpan = document.createElement("span");
      usernameSpan.className = "username";
      usernameSpan.textContent = `${message.username}: `;

      const contentSpan = document.createElement("span");
      contentSpan.className = "content";
      contentSpan.textContent = message.content;

      messageDiv.appendChild(usernameSpan);
      messageDiv.appendChild(contentSpan);
      elements.chatMessages.appendChild(messageDiv);
      elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
    },

    sendMessage: () => {
      const content = elements.chatMessageInput.value.trim();
      if (content) {
        socket.emit("chatMessage", {
          content,
          userId: userInfo.userId,
          username: userInfo.username,
          type: "chat",
          roomId: userInfo.roomId,
        });
        elements.chatMessageInput.value = "";
      }
    },

    toggleChat: () => {
      const chatBody = document.querySelector(".chat-body");
      chatBody.classList.toggle("hidden");
      elements.toggleChatButton.textContent = chatBody.classList.contains(
        "hidden"
      )
        ? "▲"
        : "▼";
    },
  };

  // Room Management Functions
  const roomManager = {
    startGame: () => {
      socket.emit("startGame", { roomId: userInfo.roomId });
    },

    leaveRoom: async () => {
      try {
        // Confirm before leaving
        const confirmMessage = userInfo.isOwner 
          ? "Are you sure you want to leave? This will delete the room and remove all players."
          : "Are you sure you want to leave the room?";
        
        if (!confirm(confirmMessage)) {
          return;
        }

        // First make the HTTP request to leave the room
        const response = await fetch(`/rooms/${userInfo.roomId}/leave`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'same-origin'
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || "Failed to leave the room");
        }

        // If we get here, the room was successfully left
        if (data.roomDeleted) {
          // Room was deleted by owner
          console.log("Room deleted by owner");
          // Emit socket event before disconnecting
          socket.emit("leaveRoom", { roomId: userInfo.roomId });
          // Disconnect socket
          socket.disconnect();
          // Show success message
          alert("Room deleted successfully");
          // Redirect to lobby
          window.location.replace("/lobby");
        } else {
          // Regular user left
          console.log("User left room");
          // Emit socket event before disconnecting
          socket.emit("leaveRoom", { roomId: userInfo.roomId });
          // Disconnect socket
          socket.disconnect();
          // Show success message
          alert("Successfully left the room");
          // Redirect to lobby
          window.location.replace("/lobby");
        }
      } catch (error) {
        console.error("Error leaving room:", error);
        alert(error.message || "Failed to leave the room. Please try again.");
      }
    },

    updatePlayerList: (members, roomOwner) => {
      elements.currentPlayers.textContent = members.length;
      elements.waitingPlayers.innerHTML = "";

      members.forEach((member) => {
        const li = document.createElement("li");
        li.textContent = member.username;
        li.dataset.userId = member.id;
        if (member.id === roomOwner.id) {
          li.classList.add("room-owner");
          li.textContent += " 👑";
        }
        elements.waitingPlayers.appendChild(li);
      });
    },
  };

  // Ready Status Management
  let isReady = false;
  const readyManager = {
    toggleReady: () => {
      isReady = !isReady;
      elements.readyButton.textContent = isReady ? "Not Ready" : "Ready";
      elements.readyButton.classList.toggle("btn-success");
      elements.readyButton.classList.toggle("btn-secondary");
      elements.readyStatus.textContent = isReady ? "Ready" : "Not Ready";

      if (isReady) {
        socket.emit("playerReady", { roomId: userInfo.roomId });
      }
    },

    updatePlayerReady: (userId, ready) => {
      const playerElement = Array.from(elements.waitingPlayers.children).find(
        (li) => parseInt(li.dataset.userId) === parseInt(userId)
      );
      if (playerElement) {
        playerElement.classList.toggle("ready", ready);
      }
    },
  };

  // Event Listeners
  elements.sendMessageButton.addEventListener("click", chatUI.sendMessage);
  elements.chatMessageInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") chatUI.sendMessage();
  });
  elements.toggleChatButton.addEventListener("click", chatUI.toggleChat);
  elements.leaveRoom.addEventListener("click", roomManager.leaveRoom);
  elements.readyButton.addEventListener("click", readyManager.toggleReady);
  if (elements.startGame) {
    console.log("Attaching start game event listener");
    elements.startGame.addEventListener("click", () => {
      console.log("Start game button clicked");
      roomManager.startGame();
    });
  } else {
    console.log("Start game button not found in DOM");
  }

  // Socket Event Handlers
  socket.on("connect", () => {
    console.log("Socket connected successfully");
    socket.emit("setUserId", parseInt(userInfo.userId));
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error);
  });

  socket.on("chatMessage", (message) => {
    chatUI.addChatMessage(message, message.userId === userInfo.userId);
  });

  socket.on("roomMembersUpdate", ({ members, roomOwner, currentPlayers }) => {
    roomManager.updatePlayerList(members, roomOwner);
    if (currentPlayers !== undefined) {
      elements.currentPlayers.textContent = currentPlayers;
    }
  });

  socket.on("playerJoined", ({ username }) => {
    chatUI.addSystemMessage(`${username} has joined the room`);
  });

  socket.on("playerLeft", ({ username, remainingPlayers }) => {
    chatUI.addSystemMessage(`${username} has left the room`);
    if (remainingPlayers !== undefined) {
      elements.currentPlayers.textContent = remainingPlayers;
    }
  });

  socket.on("roomClosed", () => {
    chatUI.addSystemMessage("The room has been closed by the owner.");
    alert("This room has been closed.");
    window.location.replace("/lobby");
  });

  socket.on("playerReadyUpdate", ({ userId, ready }) => {
    readyManager.updatePlayerReady(userId, ready);
  });

  socket.on("gameStarting", ({ readyPlayers }) => {
    if (readyPlayers.some((player) => player.id === userInfo.userId)) {
      window.location.href = `/game/${userInfo.roomId}`;
    } else {
      alert("Game is starting but you are not ready!");
    }
  });

  socket.emit("getRoomMessages", { roomId: userInfo.roomId });

  socket.on("roomMessages", (messages) => {
    messages.forEach((msg) => {
      chatUI.addChatMessage(
        {
          username: msg.username,
          content: msg.content,
        },
        msg.sender_id == userInfo.userId
      );
    });
  });

  socket.on("error", ({ message }) => {
    alert(message);
  });

  // Join room after all setup is complete
  socket.emit("joinRoom", { roomId: userInfo.roomId });
});
