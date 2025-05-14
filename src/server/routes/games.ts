import express from "express";
import { Request, Response } from "express";

import { Game } from "../db";

const router = express.Router();

router.post("/create", async (request: Request, response: Response) => {
  // @ts-ignore
  const userId = request.session.userId;
  if (!userId) {
    return response.redirect("/auth/login");
  }
  
  const { description, minPlayers, maxPlayers, password } = request.body;

  try {
    const gameId = await Game.create(
      description,
      minPlayers,
      maxPlayers,
      password,
      userId
    );

    response.redirect(`/games/${gameId}`);
  } catch (error) {
    console.log({ error });

    response.redirect("/lobby");
  }
});

router.post("/join", async (request: Request, response: Response) => {
  const { gameId, password } = request.body;
  // @ts-ignore
  const userId = request.session.userId;
  
  if (!userId) {
    return response.redirect("/auth/login");
  }

  try {
    const playerCount = await Game.join(userId, parseInt(gameId), password);
    console.log({ playerCount });

    response.redirect(`/games/${gameId}`);
  } catch (error) {
    console.log({ error });
    response.redirect("/lobby");
  }
});

router.get("/:gameId/players", async (request: Request, response: Response) => {
  const { gameId } = request.params;

  try {
    const players = await Game.getPlayers(parseInt(gameId));
    response.json(players);
  } catch (error) {
    console.log({ error });
    response.status(500).json({ error: "Failed to get players" });
  }
});

router.get("/:gameId", (request: Request, response: Response) => {
  const { gameId } = request.params;

  response.render("games/games", { gameId });
});

router.post("/:gameId/leave", async (request: Request, response: Response) => {
    // @ts-ignore - Consider properly typing session data if possible
    const userId = request.session.userId; 
    const { gameId } = request.params;

    if (!userId) {
        response.status(401).json({ message: "Unauthorized. Please log in." });
        return;
    }

    const gameIdNum = parseInt(gameId, 10);
    if (isNaN(gameIdNum)) {
        response.status(400).json({ message: "Invalid game ID format." });
        return;
    }

    try {
        const success = await Game.leave(userId, gameIdNum);
        if (success) {
            console.log(`User ${userId} successfully left game ${gameIdNum}`);
            response.status(200).json({ message: "Successfully left the game." });
            return;
        } else {
            console.warn(`Attempt to leave game ${gameIdNum} by user ${userId} was not successful (e.g., not in game).`);
            response.status(400).json({ message: "Failed to leave the game. You may not be in this game." });
            return;
        }
    } catch (error) {
        console.error(`Error processing leave game request for user ${userId}, game ${gameIdNum}:`, error);
        response.status(500).json({ message: "Internal server error while trying to leave the game." });
        return;
    }
});

router.post("/:gameId/start", async (request: Request, response: Response) => {
    const { gameId } = request.params;

    try {
        const game = await Game.start(parseInt(gameId, 10));
        response.status(200).json({ message: "Game started successfully", game });
    } catch (error) {
        console.error(`Error starting game ${gameId}:`, error);
        response.status(500).json({ message: "Failed to start the game" });
    }
});


export default router;
