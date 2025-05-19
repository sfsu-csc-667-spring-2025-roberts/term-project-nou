import { gameState } from "../state/gameState.js";
import { addChatMessage } from "../ui/chatUI.js";
import { updateGameUI } from "../ui/gameUI.js";

// Handle the start of a new game
export const startGame = (data) => {
  console.log(
    "%cGame Starting with data:",
    "color: green; font-weight: bold;",
    data
  );

  const waitingRoomElement = document.getElementById("waiting-room");
  const gameBoardElement = document.getElementById("game-board");

  if (waitingRoomElement) waitingRoomElement.classList.add("hidden");
  if (gameBoardElement) gameBoardElement.classList.remove("hidden");

  gameState.players = data.players || [];
  gameState.currentPlayer = data.currentPlayer;
  gameState.topCard = data.topCard;
  gameState.myHand = data.myHand || [];
  gameState.direction = data.direction || 1;
  gameState.gameStarted = true;
  gameState.myTurn = data.currentPlayer === gameState.myId;

  updateGameUI();
  addChatMessage({
    username: "System",
    message: "Game started! Good luck!",
    type: "system",
  });
};

// Handle card played event
export const handleCardPlayed = (data) => {
  console.log("Received cardPlayed event:", data);
  const { player, card } = data;
  const playerName = player.id === gameState.myId ? "You" : player.username;
  let cardDesc = formatCardDescription(card);
  addChatMessage({
    username: "System",
    message: `${playerName} played ${cardDesc}`,
    type: "system",
  });

  const discardPileElement = document.getElementById("discard-pile");
  if (discardPileElement) {
    discardPileElement.classList.add("card-played-animation");
    setTimeout(
      () => discardPileElement.classList.remove("card-played-animation"),
      300
    );
  }
};

// Handle card drawn event
export const handleCardDrawn = (data) => {
  console.log("Received cardDrawn event:", data);
  const { player, cardCount } = data;
  const playerName = player.id === gameState.myId ? "You" : player.username;
  addChatMessage({
    username: "System",
    message: `${playerName} drew ${cardCount === 1 ? "a card" : cardCount + " cards"}`,
    type: "system",
  });
};

// Handle player said UNO event
export const handlePlayerSaidUno = (data) => {
  console.log("Received playerSaidUno event:", data);
  const { player } = data;
  const playerName = player.id === gameState.myId ? "You" : player.username;
  addChatMessage({
    username: "System",
    message: `${playerName} shouted UNO!`,
    type: "system",
  });
};

// Handle game over event
export const handleGameOver = (data) => {
  console.log(
    "%cGame Over! Winner data:",
    "color: red; font-weight: bold;",
    data
  );
  gameState.gameStarted = false;
  const { winner } = data;
  const winnerName = winner.id === gameState.myId ? "You" : winner.username;
  addChatMessage({
    username: "System",
    message: `🎉 Game Over! ${winnerName} won the game! 🎉`,
    type: "system",
    highlight: true,
  });

  const drawCardButton = document.getElementById("draw-card");
  const sayUnoButton = document.getElementById("say-uno");
  const myHandElement = document.getElementById("my-hand");

  if (drawCardButton) drawCardButton.disabled = true;
  if (sayUnoButton) sayUnoButton.disabled = true;
  if (myHandElement)
    myHandElement
      .querySelectorAll(".uno-card")
      .forEach((c) => c.classList.add("disabled"));

  updateGameOverUI(data);
};

// Update UI for game over state
const updateGameOverUI = (data) => {
  const gameControls = document.querySelector(".game-controls");
  if (gameControls) {
    gameControls.innerHTML = "";
    const isCreator = gameState.players.find(
      (p) => p.id === gameState.myId
    )?.isCreator;

    if (isCreator) {
      const playAgainBtn = document.createElement("button");
      playAgainBtn.className = "btn btn-primary";
      playAgainBtn.textContent = "Play Again";
      playAgainBtn.onclick = () => {
        socket.emit("playAgain", { roomId: gameId });
        playAgainBtn.textContent = "Restarting...";
        playAgainBtn.disabled = true;
      };
      gameControls.appendChild(playAgainBtn);
    }

    const backToLobbyBtn = document.createElement("button");
    backToLobbyBtn.className = "btn btn-secondary";
    backToLobbyBtn.textContent = "Back to Lobby";
    backToLobbyBtn.onclick = () => {
      window.location.href = "/lobby";
    };
    gameControls.appendChild(backToLobbyBtn);
  }
};
