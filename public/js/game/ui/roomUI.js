import { gameState } from "../state/gameState.js";

export const updateRoomInfo = (data) => {
  console.log("Updating room info with data:", data);
  if (data.minPlayers !== undefined) {
    gameState.minPlayersRequired = data.minPlayers;
    console.log(`Min players required set to: ${gameState.minPlayersRequired}`);
  }

  if (!gameState.gameStarted) {
    updatePlayerCount(data);
    updateRoomSettings(data);
    updatePlayerList(data);
    updateStartButton(data);
  } else {
    console.log("Skipping waiting room UI update because game has started.");
  }
};

const updatePlayerCount = (data) => {
  const currentPlayersElement = document.getElementById("current-players");
  if (currentPlayersElement) {
    currentPlayersElement.textContent = data.players.length;
  }
};

const updateRoomSettings = (data) => {
  const maxPlayersElement = document.getElementById("max-players");
  const minPlayersInput = document.getElementById("min-players");
  const maxPlayersInput = document.getElementById("max-players-input");

  if (maxPlayersElement && data.maxPlayers !== undefined) {
    maxPlayersElement.textContent = data.maxPlayers;
  }
  if (minPlayersInput && data.minPlayers !== undefined) {
    minPlayersInput.value = data.minPlayers;
  }
  if (maxPlayersInput && data.maxPlayers !== undefined) {
    maxPlayersInput.value = data.maxPlayers;
  }
};

const updatePlayerList = (data) => {
  const waitingPlayersElement = document.getElementById("waiting-players");
  if (!waitingPlayersElement) return;

  waitingPlayersElement.innerHTML = "";
  data.players.forEach((player) => {
    const li = document.createElement("li");
    li.textContent = player.username;

    if (player.isCreator) {
      li.classList.add("creator");
      li.textContent += " (Host)";
    }

    console.log("player.id: ", player.id);
    console.log("gameState.myId: ", gameState.myId);

    if (gameState.myId && player.id === gameState.myId) {
      li.classList.add("you");
      li.textContent += " (You)";
    }

    // Add ready status
    if (player.ready) {
      li.classList.add("ready");
      li.textContent += " ✓";
    }

    waitingPlayersElement.appendChild(li);
  });

  // 如果还没有 myId，设置一个定时器来重新检查
  if (!gameState.myId) {
    setTimeout(() => {
      if (gameState.myId) {
        updateRoomInfo(data);
      }
    }, 1000);
  }
};

const updateStartButton = (data) => {
  const startGameButton = document.getElementById("start-game");
  if (startGameButton) {
    const allPlayersReady = data.players.every((player) => player.ready);
    const canStart = data.players.length >= 2 && allPlayersReady;
    startGameButton.disabled = !canStart;
    console.log(
      `Start button ${canStart ? "enabled" : "disabled"} (${data.players.length}/${gameState.minPlayersRequired} players, all ready: ${allPlayersReady})`
    );
  }
};
