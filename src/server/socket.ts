/**
 * Socket.IO Server Setup
 * Handles real-time communication between clients and server
 */

import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { Room, Message, User } from "./db";

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
        handleError(error, `updating socket_id for user ${userId}`);
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
      try {
        socket.join(roomId);
        const members = await Room.getRoomUsers(Number(roomId));
        const roomOwner = await Room.getRoomOwner(Number(roomId));
        const joiningUser = members.find(
          (member) => member.id === socket.data.userId
        );

        if (joiningUser) {
          io.to(roomId).emit("playerJoined", {
            username: joiningUser.username,
          });
        }

        io.to(roomId).emit("roomMembersUpdate", { members, roomOwner });
      } catch (error) {
        handleError(error, `joining room ${roomId}`);
      }
    });

    socket.on("leaveRoom", async ({ roomId }) => {
      try {
        const members = await Room.getRoomUsers(Number(roomId));
        const roomOwner = await Room.getRoomOwner(Number(roomId));
        const socketUser = members.find(
          (member) => member.socket_id === socket.id
        );

        if (!socketUser) {
          console.error(`No user found for socket ${socket.id}`);
          return;
        }

        io.to(roomId).emit("playerLeft", { username: socketUser.username });

        if (roomOwner && socketUser.id === roomOwner.id) {
          io.to(roomId).emit("roomClosed");
          const connectedSockets = await io.in(roomId).allSockets();
          connectedSockets.forEach((socketId) => {
            const clientSocket = io.sockets.sockets.get(socketId);
            clientSocket?.leave(roomId);
          });
        } else {
          socket.leave(roomId);
          const updatedMembers = await Room.getRoomUsers(Number(roomId));
          io.to(roomId).emit("roomMembersUpdate", {
            members: updatedMembers,
            roomOwner,
          });
        }
      } catch (error) {
        handleError(error, `handling room ${roomId} leave`);
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
      try {
        const members = await Room.getRoomUsers(Number(roomId));
        const roomOwner = await Room.getRoomOwner(Number(roomId));

        if (roomOwner && roomOwner.socket_id === socket.id) {
          const readyPlayers = members.filter((member) => member.ready);
          if (readyPlayers.length >= 2) {
            io.to(roomId).emit("gameStarting", { readyPlayers });
          } else {
            socket.emit("error", {
              message: "Need at least 2 ready players to start",
            });
          }
        }
      } catch (error) {
        handleError(error, `starting game in room ${roomId}`);
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
