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

router.get("/:gameId", (request: Request, response: Response) => {
  const { gameId } = request.params;

  response.render("games/games", { gameId });
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

router.post<{ gameId: string }>("/:gameId/start", async (request: Request<{ gameId: string }>, response: Response) => {
  const { gameId } = request.params;
  // @ts-ignore
  const userId = request.session.userId;
  
  console.log("[Server] Attempting to start game:", gameId);
  console.log("[Server] User ID:", userId);
  
  if (!userId) {
    console.log("[Server] User not authenticated");
    response.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    console.log("[Server] Starting game...");
    const gameState = await Game.startGame(parseInt(gameId));
    console.log("[Server] Game started successfully:", gameState);
    response.json({ 
      success: true, 
      gameState,
      message: "Game started successfully" 
    });
  } catch (error) {
    console.error("[Server] Error starting game:", error);
    response.status(400).json({ 
      error: error instanceof Error ? error.message : "Failed to start game"
    });
  }
});

router.get("/:gameId/play", (request: Request, response: Response) => {
  const { gameId } = request.params;
  response.render("games/play", { gameId });
});

router.get("/:gameId/cards", async (request: Request, response: Response) => {
  const { gameId } = request.params;
  // @ts-ignore
  const userId = request.session.userId;
  
  if (!userId) {
    response.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const cards = await Game.getPlayersCards(parseInt(gameId));
    // Group cards by player
    const playersCards = cards.reduce((acc, card) => {
      if (!acc[card.user_id]) {
        acc[card.user_id] = {
          username: card.username,
          cards: []
        };
      }
      acc[card.user_id].cards.push({
        id: card.card_id,
        value: card.value,
        color: card.color
      });
      return acc;
    }, {});
    
    response.json({ players: playersCards });
  } catch (error) {
    console.error('Error fetching players cards:', error);
    response.status(500).json({ error: "Failed to fetch players cards" });
  }
});

export default router;
