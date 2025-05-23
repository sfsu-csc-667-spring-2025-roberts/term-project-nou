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
          (member) => member.id === socket.data.userId
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
          (member) => member.socket_id === socket.id
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

    socket.on("startGame", async ({ roomId }) => {
      console.log(`[Socket] Attempting to start game for room ${roomId}`);
      try {
        // First check if the room exists and has enough players
        const roomOwner = await Room.getRoomOwner(Number(roomId));
        console.log(`[Socket] Room owner:`, roomOwner);
        
        if (!roomOwner) {
          console.error(`[Socket] Room ${roomId} not found`);
          socket.emit("error", { message: "Room not found" });
          return;
        }

        const members = await Room.getRoomUsers(Number(roomId));
        console.log(`[Socket] Room members:`, members);
        
        if (members.length < 2) {
          console.error(`[Socket] Not enough players in room ${roomId}`);
          socket.emit("error", { message: "Need at least 2 players to start" });
          return;
        }

        // Reset room status to waiting if it's in playing state
        const roomInfo = await db.oneOrNone(
          `SELECT status FROM rooms WHERE id = $1`,
          [roomId]
        );
        console.log(`[Socket] Current room status:`, roomInfo);

        if (roomInfo && roomInfo.status === 'playing') {
          console.log(`[Socket] Resetting room ${roomId} from playing to waiting state`);
          await db.none(
            `UPDATE rooms SET status = 'waiting' WHERE id = $1`,
            [roomId]
          );
        }

        const result = await Room.start(Number(roomId));
        console.log(`[Socket] Game start result:`, result);
        
        if (result && result.id) {
          // Verify the game state was created
          const gameState = await db.oneOrNone(
            `SELECT * FROM "gameState" WHERE game_id = $1`,
            [result.id]
          );
          console.log(`[Socket] Created game state:`, gameState);
          
          if (!gameState) {
            console.error(`[Socket] Game state not created for game ${result.id}`);
            socket.emit("error", { message: "Failed to create game state" });
            return;
          }

          console.log(`[Socket] Emitting gameStarting event for room ${roomId}`);
          io.to(roomId).emit("gameStarting", { gameId: result.id });
        } else {
          console.error(`[Socket] Failed to start game for room ${roomId}`);
          socket.emit("error", { message: "Failed to start game" });
        }
      } catch (error) {
        console.error(`[Socket] Error starting game for room ${roomId}:`, error);
        socket.emit("error", { 
          message: error instanceof Error ? error.message : "Error starting game",
          context: "startGame"
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
