import { gameState } from "../state/gameState.js";
import { addChatMessage } from "../ui/chatUI.js";

// Fetch players in the room
export const fetchPlayers = async (gameId) => {
  console.log(`fetchPlayers attempting for gameId: ${gameId}`);

  if (!gameId) {
    console.error(
      "fetchPlayers cannot run: gameId is invalid or undefined at time of call."
    );
    return;
  }

  if (gameState.gameStarted) {
    console.log("Game already started, stopping player polling.");
    return;
  }

  try {
    const url = `/games/${encodeURIComponent(gameId)}/players`;
    console.log(`Fetching players from URL: ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        `HTTP error fetching players: ${response.status} ${response.statusText}`
      );
      let errorBody = `Failed to load player list (${response.status}).`;
      try {
        const errorData = await response.json();
        errorBody = errorData.message || errorBody;
      } catch (e) {
        /* Ignore */
      }
      throw new Error(errorBody);
    }

    const players = await response.json();
    console.log("Fetched players successfully:", players);

    const maxPlayers = 3;
    updateRoomInfo({
      players: players,
      minPlayers: gameState.minPlayersRequired,
      maxPlayers: maxPlayers,
      currentPlayers: players.length,
    });
  } catch (error) {
    console.error("Error during fetchPlayers:", error);
    addChatMessage({
      username: "System",
      message: `Error updating player list: ${error.message}`,
      type: "system",
    });
  }
};

// Handle leaving the room
export const handleLeaveRoom = async (gameId, socket) => {
  if (confirm("Are you sure you want to leave the room?")) {
    console.log("Leaving room...");
    try {
      const response = await fetch(
        `/games/${encodeURIComponent(gameId)}/leave`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: gameState.myId }),
        }
      );

      if (response.ok) {
        console.log("Successfully left the room.");
        socket.disconnect();
        window.location.href = "/lobby";
      } else {
        const errorData = await response.json();
        console.error("Failed to leave the room:", errorData.message);
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Error leaving the room:", error);
      alert(
        "An error occurred while trying to leave the room. Please try again."
      );
    }
  }
};

// Handle starting the game
export const handleStartGame = async (gameId) => {
  console.log("Start game button clicked.");
  try {
    const response = await fetch(`/games/${gameId}/start`, {
      method: "POST",
    });
    const data = await response.json();

    if (response.ok) {
      console.log("Game started successfully:", data);
      startGame(data.game);
    } else {
      console.error("Failed to start the game:", data.message);
      alert("Failed to start the game: " + data.message);
    }
  } catch (error) {
    console.error("Error starting the game:", error);
    alert("An error occurred while starting the game.");
  }
};
