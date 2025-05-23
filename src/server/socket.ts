/**
 * Socket.IO Server Setup
 * Handles real-time communication between clients and server
 */

import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { Room, Message, User } from "./db";
import db from "./db/connection";

// Type Definitions
interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  type: string;
  roomId: string;
  senderId: string;
}

interface Player {
  id: string;
  username: string;
  isCreator: boolean;
  ready: boolean;
}

interface RoomMember {
  id: number;
  username: string;
  socket_id: string | null;
  is_creator: boolean;
  ready: boolean;
}

interface GameRoom {
  id: string;
  players: Player[];
  gameStarted: boolean;
}

// Constants
const MESSAGE_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Sets up Socket.IO server with all necessary event handlers
 * @param server HTTP server instance
 * @returns Socket.IO server instance
 */
export function setupSocket(server: HttpServer) {
  const io = new Server(server);
  const messages: Message[] = [];
  const gameRooms: Map<string, GameRoom> = new Map();

  // Message cleanup mechanism
  setInterval(() => {
    const now = Date.now();
    const cutoff = now - MESSAGE_CLEANUP_INTERVAL;
    const initialLength = messages.length;
    messages.splice(
      0,
      messages.findIndex((msg) => msg.timestamp.getTime() > cutoff)
    );
    if (messages.length < initialLength) {
      console.log(`Cleaned up ${initialLength - messages.length} old messages`);
    }
  }, MESSAGE_CLEANUP_INTERVAL);

  // Error handling utility
  const handleError = (error: any, context: string) => {
    console.error(`Error in ${context}:`, error);
    return {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      context
    };
  };

  // Socket connection handler
  io.on("connection", (socket) => {
    console.log("New user connected, socket ID:", socket.id);

    // User Management
    socket.on("setUserId", async (userId: number) => {
      socket.data.userId = userId;
      try {
        await User.updateSocketId(userId, socket.id);
        console.log(`Updated socket_id for user ${userId}`);
      } catch (error) {
        const errorObj = handleError(error, `updating socket_id for user ${userId}`);
        socket.emit("error", errorObj);
      }
    });

    // Disconnect handler
    socket.on("disconnect", async () => {
      if (socket.data.userId) {
        try {
          const user = await User.getById(socket.data.userId);
          if (user?.socket_id === socket.id) {
            await User.updateSocketId(socket.data.userId, null);
            console.log(`Cleared socket_id for user ${socket.data.userId}`);
          }
        } catch (error) {
          handleError(
            error,
            `clearing socket_id for user ${socket.data.userId}`
          );
        }
      }
    });

    // Chat Message Handler
    socket.on(
      "chatMessage",
      async ({ content, type, userId, username, roomId, isGlobal }) => {
        try {
          if (isGlobal) {
            // Global (lobby) chat message
            const message = {
              content,
              type,
              sender_id: parseInt(userId),
              is_global: true,
            };
            const savedMessage = await Message.insertMessage(message);
            const outgoingMessage = {
              ...savedMessage,
              username: username,
              userId: parseInt(userId),
            };
            console.log("outgoingMessage");
            io.emit("chatMessage", outgoingMessage);
            return;
          }
          // Room chat message (default)
          const message = {
            content,
            type,
            sender_id: parseInt(userId),
            room_id: roomId ? parseInt(roomId) : undefined,
            game_id: undefined, // Not used in waiting room
            is_global: false,
          };
          const savedMessage = await Message.insertMessage(message);
          const outgoingMessage = {
            ...savedMessage,
            username,
            userId,
          };
          io.emit("chatMessage", outgoingMessage);
        } catch (error) {
          handleError(error, "handling chat message");
        }
      }
    );

    // Global (lobby) chat history
    socket.on("getGlobalMessages", async () => {
      try {
        const messages = await Message.getGlobalMessages();
        socket.emit("globalMessages", messages);
      } catch (error) {
        handleError(error, "fetching global messages");
        socket.emit("globalMessages", []);
      }
    });

    // Room Management Handlers
    socket.on("joinRoom", async ({ roomId }) => {
      console.log(`[Socket] User ${socket.data.userId} joining room ${roomId}`);
      try {
        socket.join(roomId);
        const members = await Room.getRoomUsers(Number(roomId));
        const roomOwner = await Room.getRoomOwner(Number(roomId));
        const joiningUser = members.find(
          (member: RoomMember) => member.id === socket.data.userId
        );

        if (joiningUser) {
          console.log(`[Socket] Emitting playerJoined event for user ${joiningUser.username}`);
          io.to(roomId).emit("playerJoined", {
            username: joiningUser.username,
          });
        }

        console.log(`[Socket] Emitting roomMembersUpdate event for room ${roomId}`);
        io.to(roomId).emit("roomMembersUpdate", { members, roomOwner });
        
        // Update lobby with new room list
        const rooms = await Room.getAllRooms();
        io.emit("roomListUpdate", rooms);
      } catch (error) {
        console.error(`[Socket] Error joining room ${roomId}:`, error);
      }
    });

    socket.on("leaveRoom", async (roomId: number) => {
      try {
        const userId = socket.data.userId;
        if (!userId) {
          throw new Error("User not authenticated");
        }

        console.log(`[Socket] User ${userId} leaving room ${roomId}`);
        const result = await Room.leave_room(userId, roomId);
        
        if (!result || !result.result) {
          throw new Error("Failed to leave room");
        }

        // Leave the socket room
        socket.leave(`room:${roomId}`);

        // If the room was deleted (owner left)
        if (result.result.deleted) {
          console.log(`[Socket] Room ${roomId} was deleted by owner ${userId}`);
          socket.emit("roomDeleted");
          return;
        }

        // Regular user left
        console.log(`[Socket] User ${userId} successfully left room ${roomId}`);
        
        // If the room is in playing state, clean up game state
        if (result.result.status === 'playing') {
          // Get the game ID for this room
          const game = await db.oneOrNone(
            `SELECT id FROM games WHERE room_id = $1`,
            [roomId]
          );

          if (game) {
            // Delete the game state
            await db.none(
              `DELETE FROM "gameState" WHERE game_id = $1`,
              [game.id]
            );
            // Delete the game
            await db.none(
              `DELETE FROM games WHERE id = $1`,
              [game.id]
            );
            // Reset room status to waiting
            await db.none(
              `UPDATE rooms SET status = 'waiting' WHERE id = $1`,
              [roomId]
            );
          }
        }

        // Notify other users in the room
        socket.to(`room:${roomId}`).emit("roomUpdate", {
          type: "playerLeft",
          userId,
          currentPlayers: result.result.current_players
        });

        // Notify the user who left
        socket.emit("leftRoom", {
          roomId,
          currentPlayers: result.result.current_players
        });

      } catch (error) {
        console.error(`[Socket] Error leaving room:`, error);
        socket.emit("error", {
          message: "Failed to leave room",
          context: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    socket.on("joinLobby", async () => {
      try {
        socket.join("lobby");
        const rooms = await Room.getAllRooms();
        socket.emit("roomListUpdate", rooms);
      } catch (error) {
        handleError(error, "joining lobby");
      }
    });

    // Game State Handlers
    socket.on("playerReady", async ({ roomId }) => {
      try {
        const members = await Room.getRoomUsers(Number(roomId));
        const socketUser = members.find(
          (member: RoomMember) => member.socket_id === socket.id
        );

        if (socketUser) {
          io.to(roomId).emit("playerReadyUpdate", {
            userId: socketUser.id,
            username: socketUser.username,
            ready: true,
          });
        }
      } catch (error) {
        handleError(error, `handling player ready in room ${roomId}`);
      }
    });

    socket.on("startGame", async (data: { roomId: string | number, userId: string | number }) => {
      try {
        const userId = socket.data.userId;
        if (!userId) {
          socket.emit("roomError", {
            message: "User not authenticated",
            redirect: "/lobby"
          });
          return;
        }

        const roomId = Number(data.roomId);
        console.log(`[Socket] User ${userId} starting game in room ${roomId}`);

        // First check the room state
        const roomState = await db.oneOrNone(
          `SELECT r.*, 
           (SELECT COUNT(*) FROM room_users WHERE room_id = r.id) as current_players
           FROM rooms r WHERE r.id = $1`,
          [roomId]
        );

        if (!roomState) {
          socket.emit("roomError", {
            message: "Room not found",
            redirect: "/lobby"
          });
          return;
        }

        console.log("Current room state:", roomState);

        // If room is in playing state, reset it first
        if (roomState.status === 'playing') {
          console.log("Room is in playing state, resetting to waiting...");
          // Get the game ID for this room
          const game = await db.oneOrNone(
            `SELECT id FROM games WHERE room_id = $1`,
            [roomId]
          );

          if (game) {
            // Delete the game state
            await db.none(
              `DELETE FROM "gameState" WHERE game_id = $1`,
              [game.id]
            );
            // Delete the game
            await db.none(
              `DELETE FROM games WHERE id = $1`,
              [game.id]
            );
          }

          // Reset room status to waiting
          await db.none(
            `UPDATE rooms SET status = 'waiting' WHERE id = $1`,
            [roomId]
          );

          // Emit room update to all clients
          io.to(roomId.toString()).emit("roomUpdate", {
            type: "statusChange",
            status: "waiting"
          });

          // Wait a short moment to ensure state is updated
          await new Promise(resolve => setTimeout(resolve, 100));
        } else if (roomState.status !== 'waiting') {
          socket.emit("roomError", {
            message: `Cannot start game: Room is in ${roomState.status} state`
          });
          return;
        }

        if (roomState.current_players < 2) {
          socket.emit("roomError", {
            message: `Cannot start game: Need at least 2 players (current: ${roomState.current_players})`
          });
          return;
        }

        // Start the game
        const result = await Room.start_room(roomId, userId);
        console.log("Game start result:", result);
        
        if (result.result === 'success') {
          // Get the updated game state
          const gameState = await Room.get_room_state(roomId);
          console.log("Game state after start:", gameState);
          
          // Emit game started event to all players in the room
          io.to(roomId.toString()).emit("gameStarted", {
            gameId: result.id,
            players: gameState.players,
            currentPlayer: gameState.current_player_id,
            direction: gameState.direction,
            topCard: gameState.discard_pile_top,
            playerHands: gameState.player_hands
          });

          // Update room status in lobby
          const rooms = await Room.getAllRooms();
          io.emit("roomListUpdate", rooms);
        } else {
          console.error("Failed to start game:", result.result);
          socket.emit("roomError", {
            message: `Failed to start game: ${result.result}`
          });
        }
      } catch (error) {
        console.error(`[Socket] Error starting game in room ${data.roomId}:`, error);
        socket.emit("roomError", {
          message: error instanceof Error ? error.message : "Failed to start game"
        });
      }
    });

    socket.on("getRoomMessages", async ({ roomId }) => {
      try {
        const messages = await Message.getMessagesByRoom(Number(roomId));
        socket.emit("roomMessages", messages);
      } catch (error) {
        handleError(error, "fetching room messages");
        socket.emit("roomMessages", []); // fallback
      }
    });
  });

  return io;
}
