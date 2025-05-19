// Network utility functions for making API requests

// Fetch current user information
export const fetchCurrentUser = async () => {
  try {
    const response = await fetch("/api/me");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching user data:", error);
    throw error;
  }
};

// Fetch players in a game room
export const fetchRoomPlayers = async (gameId) => {
  try {
    const url = `/games/${encodeURIComponent(gameId)}/players`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching room players:", error);
    throw error;
  }
};

// Leave a game room
export const leaveRoom = async (gameId, userId) => {
  try {
    const response = await fetch(`/games/${encodeURIComponent(gameId)}/leave`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to leave room");
    }
    return true;
  } catch (error) {
    console.error("Error leaving room:", error);
    throw error;
  }
};

// Start a game
export const startGame = async (gameId) => {
  try {
    const response = await fetch(`/games/${gameId}/start`, {
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to start game");
    }
    return await response.json();
  } catch (error) {
    console.error("Error starting game:", error);
    throw error;
  }
};
