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
  };

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
    leaveRoom: async () => {
      const confirmMsg = userInfo.isOwner
        ? "You are the room owner. Leaving will delete the room and remove all players. Are you sure?"
        : "Are you sure you want to leave the room?";

      if (confirm(confirmMsg)) {
        socket.emit("leaveRoom", { roomId: userInfo.roomId });

        try {
          const endpoint = userInfo.isOwner
            ? `/rooms/${userInfo.roomId}/delete`
            : `/rooms/${userInfo.roomId}/leave`;
          const res = await fetch(endpoint, { method: "POST" });

          if (res.ok) {
            window.location.href = "/lobby";
          } else {
            alert("Failed to leave room.");
          }
        } catch (error) {
          console.error("Error leaving room:", error);
          alert("Failed to leave room.");
        }
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

  socket.on("roomMembersUpdate", ({ members, roomOwner }) => {
    roomManager.updatePlayerList(members, roomOwner);
  });

  socket.on("playerJoined", ({ username }) => {
    chatUI.addSystemMessage(`${username} has joined the room`);
  });

  socket.on("playerLeft", ({ username }) => {
    chatUI.addSystemMessage(`${username} has left the room`);
  });

  socket.on("roomClosed", () => {
    chatUI.addSystemMessage("The room has been closed by the owner.");
    alert("This room has been closed.");
    window.location.href = "/lobby";
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
