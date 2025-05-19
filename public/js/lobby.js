// =====================
// 1. get global messages
// =====================
const chatWindow = document.getElementById("chatWindow");
const chatHeader = document.getElementById("moveableHeader");
const messagesDiv = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const toggleChatButton = document.getElementById("toggleChat");

// user info
const userId = document.getElementById("userId").getAttribute("data-userId");
const username = document
  .getElementById("userId")
  .getAttribute("data-username");

// =====================
// 2. Socket connection
// =====================
const socket = io();

socket.on("connect", () => {
  socket.emit("setUserId", parseInt(userId));
  socket.emit("getGlobalMessages");
});

socket.on("globalMessages", (messages) => {
  messagesDiv.innerHTML = "";
  messages.forEach((msg) => {
    addChatMessage(msg);
  });
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on("chatMessage", (message) => {
  addChatMessage(message);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error);
});
socket.on("error", (error) => {
  console.error("Socket error:", error);
});

// =====================
// 3. render chat messages
// =====================
function addChatMessage(msg) {
  const messageElement = document.createElement("div");
  messageElement.className = "message";
  messageElement.innerHTML = `
        <span class="userId">${msg.username}: </span>
        <span class="content">${msg.content}</span>
        <span class="timestamp">&nbsp;${msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ""}</span>
    `;
  messagesDiv.appendChild(messageElement);
}

// =====================
// 4. send chat message
// =====================
messageForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const content = messageInput.value.trim();
  console.log("username", username);
  console.log("=====================");
  if (content) {
    socket.emit("chatMessage", {
      content,
      userId: parseInt(userId),
      username: username,
      type: "chat",
      isGlobal: true,
    });
    messageInput.value = "";
  }
});

// =====================
// 5. chat window
// =====================
let offsetX = 0,
  offsetY = 0;
let isDragging = false;

chatHeader.addEventListener("mousedown", function (e) {
  isDragging = true;
  offsetX = e.clientX - chatWindow.offsetLeft;
  offsetY = e.clientY - chatWindow.offsetTop;
  document.addEventListener("mousemove", dragWindow);
  document.addEventListener("mouseup", stopDragging);
  chatWindow.style.cursor = "grabbing";
});

function dragWindow(e) {
  if (!isDragging) return;
  let newX = e.clientX - offsetX;
  let newY = e.clientY - offsetY;
  const windowWidth = chatWindow.offsetWidth;
  const windowHeight = chatWindow.offsetHeight;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  newX = Math.max(0, Math.min(newX, screenWidth - windowWidth));
  newY = Math.max(0, Math.min(newY, screenHeight - windowHeight));
  chatWindow.style.left = newX + "px";
  chatWindow.style.top = newY + "px";
}

function stopDragging() {
  isDragging = false;
  document.removeEventListener("mousemove", dragWindow);
  document.removeEventListener("mouseup", stopDragging);
  chatWindow.style.cursor = "grab";
}

// collapse chat window
if (toggleChatButton) {
  toggleChatButton.addEventListener("click", () => {
    chatWindow.classList.toggle("collapsed");
    toggleChatButton.textContent = chatWindow.classList.contains("collapsed")
      ? "▲"
      : "▼";
  });
}
