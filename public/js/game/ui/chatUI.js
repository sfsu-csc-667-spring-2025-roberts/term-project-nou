import { gameState } from "../state/gameState.js";

export const addChatMessage = (data) => {
  const chatMessagesElement = document.getElementById("chat-messages");
  if (!chatMessagesElement) return;

  const messageDiv = document.createElement("div");
  messageDiv.className = "chat-message";
  const isMyMsg = data.senderId === gameState.myId;

  if (data.type === "system") {
    messageDiv.classList.add("system");
    messageDiv.textContent = data.message;
    if (data.highlight) messageDiv.classList.add("highlight");
  } else {
    messageDiv.classList.toggle("my-message", isMyMsg);
    messageDiv.classList.toggle("other-message", !isMyMsg);

    const usernameSpan = document.createElement("span");
    usernameSpan.className = "username";
    usernameSpan.textContent = isMyMsg ? "You:" : `${data.username}:`;

    messageDiv.appendChild(usernameSpan);
    messageDiv.appendChild(document.createTextNode(` ${data.message}`));
  }
  chatMessagesElement.appendChild(messageDiv);
  chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
};

export const setupChatEvents = (socket, gameId) => {
  const chatMessageInput = document.getElementById("chat-message");
  const sendMessageButton = document.getElementById("send-message");
  const toggleChatButton = document.getElementById("toggleChat");
  const chatBodyElement = document.querySelector(".game-chat .chat-body");

  const sendChatMessage = () => {
    if (!chatMessageInput) return;
    const message = chatMessageInput.value.trim();
    if (message) {
      console.log("Sending chat message:", message);
      socket.emit("chatMessage", { roomId: gameId, message });
      chatMessageInput.value = "";
    }
  };

  if (sendMessageButton && chatMessageInput) {
    sendMessageButton.addEventListener("click", sendChatMessage);
    chatMessageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendChatMessage();
    });
  }

  if (toggleChatButton && chatBodyElement) {
    toggleChatButton.addEventListener("click", () => {
      const isCollapsed = chatBodyElement.style.display === "none";
      chatBodyElement.style.display = isCollapsed ? "" : "none";
      toggleChatButton.textContent = isCollapsed ? "▼" : "▲";
    });
  }
};
