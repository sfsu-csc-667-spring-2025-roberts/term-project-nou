import express, { Request, Response, Router, RequestHandler } from "express";
import db from "../db/connection";
import { Room } from "../db";
import session from "express-session";

// Type for session with userId
interface SessionWithUserId extends session.Session {
  userId?: number;
  error?: string;
}

// Type for request with session
interface RequestWithSession extends Request {
  session: SessionWithUserId;
}

const router: Router = express.Router();

router.get(
  "/:gameId",
  (async (request: RequestWithSession, response: Response) => {
    const userId = request.session.userId;
    if (!userId) {
      console.log("[Game Route] No user ID in session, redirecting to login");
      return response.redirect("/auth/login");
    }

    const { gameId } = request.params;
    console.log(`[Game Route] Fetching game state for game ID: ${gameId}, user ID: ${userId}`);
    
    try {
      // First check if the user is part of this game
      const playerInGame = await db.oneOrNone(
        `SELECT * FROM "game_users" WHERE game_id = $1 AND user_id = $2`,
        [gameId, userId]
      );
      
      console.log(`[Game Route] Player in game check:`, playerInGame);
      
      if (!playerInGame) {
        // Try to get the room ID from the game
        const game = await db.oneOrNone(
          `SELECT room_id, status FROM games WHERE id = $1`,
          [gameId]
        );
        
        if (!game) {
          console.log(`[Game Route] Game ${gameId} not found`);
          return response.redirect("/lobby");
        }

        // Check if user is in the room
        const roomMembers = await Room.getRoomUsers(game.room_id);
        const userInRoom = roomMembers.find(member => member.id === userId);
        
        if (!userInRoom) {
          console.log(`[Game Route] User ${userId} is not in room ${game.room_id}`);
          return response.redirect("/lobby");
        }

        // Add user to game players
        await db.none(
          `INSERT INTO "game_users" (game_id, user_id, seat, status) VALUES ($1, $2, (SELECT COALESCE(MAX(seat), 0) + 1 FROM "game_users" WHERE game_id = $1), 'active')`,
          [gameId, userId]
        );
        console.log(`[Game Route] Added user ${userId} to game ${gameId}`);
      }

      const gameState = await db.oneOrNone(
        `SELECT * FROM "gameState" WHERE game_id = $1`,
        [gameId]
      );
      
      console.log(`[Game Route] Game state query result:`, gameState);
      
      if (!gameState) {
        console.log(`[Game Route] No game state found for game ID: ${gameId}`);
        return response.redirect("/lobby");
      }

      // Check if the game is still active
      const game = await db.oneOrNone(
        `SELECT status FROM games WHERE id = $1`,
        [gameId]
      );

      if (!game || game.status !== 'active') {
        console.log(`[Game Route] Game ${gameId} is not active`);
        return response.redirect("/lobby");
      }

      // If game is in playing state, show game board
      if (gameState.status === 'playing') {
        console.log(`[Game Route] Rendering game board for game ID: ${gameId}`);
        return response.render("games/game-board", {
          userId,
          gameId,
          gameState
        });
      }

      // Otherwise show waiting room
      console.log(`[Game Route] Rendering waiting room for game ID: ${gameId}`);
      return response.render("games/waiting-room", {
        userId,
        gameId
      });
    } catch (error) {
      console.error(`[Game Route] Error getting game state for game ${gameId}:`, error);
      return response.redirect("/lobby");
    }
  }) as RequestHandler
);

// Add leave game route
router.post(
  "/:gameId/leave",
  (async (request: RequestWithSession, response: Response) => {
    const userId = request.session.userId;
    if (!userId) {
      console.log("[Game Route] No user ID in session");
      return response.status(401).json({ message: "Unauthorized. Please log in." });
    }

    const { gameId } = request.params;
    console.log(`[Game Route] User ${userId} leaving game ${gameId}`);

    try {
      // Get the room ID for this game
      const game = await db.oneOrNone(
        `SELECT room_id FROM games WHERE id = $1`,
        [gameId]
      );

      if (!game) {
        console.log(`[Game Route] Game ${gameId} not found`);
        return response.status(404).json({ message: "Game not found" });
      }

      // Remove user from game players
      await db.none(
        `DELETE FROM "game_users" WHERE game_id = $1 AND user_id = $2`,
        [gameId, userId]
      );

      // Check if there are any players left
      const remainingPlayers = await db.oneOrNone(
        `SELECT COUNT(*) as count FROM "game_users" WHERE game_id = $1`,
        [gameId]
      );

      if (remainingPlayers && remainingPlayers.count === 0) {
        // No players left, clean up the game
        console.log(`[Game Route] No players left in game ${gameId}, cleaning up`);
        
        // Delete game state
        await db.none(
          `DELETE FROM "gameState" WHERE game_id = $1`,
          [gameId]
        );

        // Delete game cards
        await db.none(
          `DELETE FROM "gameCards" WHERE game_id = $1`,
          [gameId]
        );

        // Delete the game
        await db.none(
          `DELETE FROM games WHERE id = $1`,
          [gameId]
        );

        // Reset room status to waiting
        await db.none(
          `UPDATE rooms SET status = 'waiting' WHERE id = $1`,
          [game.room_id]
        );
      }

      console.log(`[Game Route] User ${userId} successfully left game ${gameId}`);
      response.status(200).json({ 
        message: "Successfully left the game",
        roomId: game.room_id
      });
    } catch (error) {
      console.error(`[Game Route] Error leaving game ${gameId}:`, error);
      response.status(500).json({ 
        message: "Failed to leave game",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }) as RequestHandler
);

export default router;
