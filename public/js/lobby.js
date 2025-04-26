const chatWindow = document.getElementById("chatWindow");
const chatHeader = document.getElementById("moveableHeader");

// From Professor's code
const createGameButton = document.querySelector("#create-game-button");
const createGameContainer = document.querySelector("#create-game-container");
const closeButton = document.querySelector("#close-create-game-form");

createGameButton?.addEventListener("click", (event) => {
  event.preventDefault();

  createGameContainer?.classList.add("visible");
});

closeButton?.addEventListener("click", (event) => {
  event.preventDefault();

  createGameContainer?.classList.remove("visible");
});

createGameContainer?.addEventListener("click", (event) => {
  if (createGameContainer !== event.target) {
    return;
  }

  createGameContainer?.classList.remove("visible");
});
// End of Professor's code

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

  // Keep the window inside the viewport
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

const toggleChatButton = document.getElementById("toggleChat");

// collapse chat window
toggleChatButton.addEventListener("click", () => {
  chatWindow.classList.toggle("collapsed");
  toggleChatButton.textContent = chatWindow.classList.contains("collapsed")
    ? "▲"
    : "▼";
});
