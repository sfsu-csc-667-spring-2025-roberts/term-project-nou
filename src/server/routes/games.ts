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

router.get(
  "/:gameId/state",
  (async (request: RequestWithSession, response: Response) => {
    const userId = request.session.userId;
    if (!userId) {
      response.status(401).json({ message: "Unauthorized" });
      return;
    }

    const { gameId } = request.params;
    console.log(`[Game Route] Fetching game state for game ID: ${gameId}, user ID: ${userId}`);
    
    try {
      // Get the game state
      const gameState = await db.oneOrNone(
        `WITH game_info AS (
          SELECT 
            g.id,
            g.status,
            g.winner_id,
            g.start_time,
            g.end_time,
            gs.current_player_id,
            gs.direction,
            gs.current_color,
            gs.last_card_played_id,
            gs.discard_pile_count,
            gs.draw_pile_count,
            gs.last_action_time,
            gs.status as game_status
          FROM games g
          LEFT JOIN "gameState" gs ON g.id = gs.game_id
          WHERE g.id = $1
        ),
        player_cards AS (
          SELECT 
            gc.game_id,
            gc.player_id,
            json_agg(
              json_build_object(
                'id', gc.id,
                'type', gc.card_type,
                'color', gc.card_color,
                'value', gc.card_value,
                'position', gc.position
              ) ORDER BY gc.position
            ) as hand
          FROM "gameCards" gc
          WHERE gc.game_id = $1 AND gc.location = 'hand'
          GROUP BY gc.game_id, gc.player_id
        ),
        discard_pile AS (
          SELECT 
            gc.game_id,
            json_build_object(
              'id', gc.id,
              'type', gc.card_type,
              'color', gc.card_color,
              'value', gc.card_value
            ) as top_card
          FROM "gameCards" gc
          WHERE gc.game_id = $1 AND gc.location = 'discard'
          ORDER BY gc.position DESC
          LIMIT 1
        ),
        draw_pile AS (
          SELECT 
            gc.game_id,
            COUNT(*) as card_count,
            json_agg(
              json_build_object(
                'id', gc.id,
                'type', gc.card_type,
                'color', gc.card_color,
                'value', gc.card_value
              ) ORDER BY gc.position
            ) as cards
          FROM "gameCards" gc
          WHERE gc.game_id = $1 AND gc.location = 'deck'
          GROUP BY gc.game_id
        ),
        players AS (
          SELECT 
            u.id,
            u.username,
            u.email,
            u.socket_id,
            gu.game_id,
            gu.seat,
            gu.status as player_status,
            COALESCE(pc.hand, '[]'::json) as hand
          FROM users u
          JOIN "game_users" gu ON u.id = gu.user_id
          LEFT JOIN player_cards pc ON pc.player_id = u.id AND pc.game_id = gu.game_id
          WHERE gu.game_id = $1
          ORDER BY gu.seat
        )
        SELECT 
          gi.*,
          COALESCE(
            (
              SELECT json_object_agg(pc.player_id, pc.hand)
              FROM player_cards pc
              WHERE pc.game_id = gi.id
            ),
            '{}'::json
          ) as player_hands,
          dp.top_card,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', p.id,
                  'username', p.username,
                  'email', p.email,
                  'socket_id', p.socket_id,
                  'seat', p.seat,
                  'status', p.player_status,
                  'hand', p.hand
                )
              )
              FROM players p
              WHERE p.game_id = gi.id
            ),
            '[]'::json
          ) as players,
          COALESCE(
            (
              SELECT json_build_object(
                'count', dp.card_count,
                'cards', dp.cards
              )
              FROM draw_pile dp
              WHERE dp.game_id = gi.id
            ),
            json_build_object('count', 0, 'cards', '[]'::json)
          ) as draw_pile,
          CASE 
            WHEN gi.current_player_id = $2 THEN true
            ELSE false
          END as is_my_turn
        FROM game_info gi
        LEFT JOIN discard_pile dp ON gi.id = dp.game_id
        WHERE gi.id = $1`,
        [gameId, userId]
      );

      if (!gameState) {
        console.log(`[Game Route] No game state found for game ID: ${gameId}`);
        response.status(404).json({ message: "Game not found" });
        return;
      }

      // Add the user's ID to the response
      gameState.myId = userId;
      gameState.gameId = gameState.id;

      // Log the game state for debugging
      console.log(`[Game Route] Game state for game ${gameId}:`, {
        id: gameState.id,
        gameId: gameState.gameId,
        status: gameState.status,
        game_status: gameState.game_status,
        current_player_id: gameState.current_player_id,
        current_color: gameState.current_color,
        direction: gameState.direction,
        player_hands: gameState.player_hands ? Object.keys(gameState.player_hands).length : 0,
        top_card: gameState.top_card ? 'present' : 'missing',
        players: gameState.players ? gameState.players.length : 0,
        card_counts: {
          deck: gameState.draw_pile_count,
          discard: gameState.discard_pile_count,
          draw_pile: gameState.draw_pile ? gameState.draw_pile.count : 0
        },
        is_my_turn: gameState.is_my_turn,
        last_action_time: gameState.last_action_time
      });

      // Log the full game state for debugging
      console.log(`[Game Route] Full game state:`, JSON.stringify(gameState, null, 2));

      // Add a small delay to ensure all updates are complete
      await new Promise(resolve => setTimeout(resolve, 100));

      response.json(gameState);
    } catch (error) {
      console.error(`[Game Route] Error getting game state for game ${gameId}:`, error);
      response.status(500).json({ message: "Failed to get game state" });
    }
  }) as unknown as RequestHandler
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
