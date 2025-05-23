import express, { Request, Response, Router, RequestHandler } from "express";
import { Room, User } from "../db";
import session from "express-session";

const router: Router = express.Router();

// Helper function for error handling
const handleError = (
  error: any,
  context: string,
  response: Response,
  redirectPath: string = "/lobby"
) => {
  console.error(`Error in ${context}:`, error);
  response.redirect(redirectPath);
};

// Type for session with userId
interface SessionWithUserId extends session.Session {
  userId?: number;
  error?: string;
}

// Type for request with session
interface RequestWithSession extends Request {
  session: SessionWithUserId;
}

// Create room route
router.post(
  "/create-room",
  (async (request: RequestWithSession, response: Response) => {
    const { userId } = request.session;
    console.log("POST /create-room - Session:", { userId, sessionID: request.sessionID });

    if (!userId) {
      console.log("No userId in session");
      return response
        .status(401)
        .json({ message: "Unauthorized. Please log in." });
    }

    const {
      name,
      maxPlayers,
      isPrivate,
      password,
      startingCards,
      drawUntilPlayable,
      stacking,
    } = request.body;

    console.log("Create room request:", {
      name,
      maxPlayers,
      isPrivate,
      hasPassword: !!password,
      startingCards,
      drawUntilPlayable,
      stacking,
    });

    try {
      // Validate input
      if (!name || !maxPlayers) {
        console.log("Missing required fields");
        return response
          .status(400)
          .json({ message: "Room name and max players are required." });
      }

      if (isPrivate === "true" && !password) {
        console.log("Missing password for private room");
        return response
          .status(400)
          .json({ message: "Password is required for private rooms." });
      }

      console.log("Creating room...");
      const roomId = await Room.createRoom(userId, {
        name,
        maxPlayers: parseInt(maxPlayers),
        isPrivate: isPrivate === "true",
        password: isPrivate === "true" ? password : null,
        startingCards: parseInt(startingCards) || 7,
        drawUntilPlayable: drawUntilPlayable || false,
        stacking: stacking || false,
      });

      console.log("Room created successfully:", roomId);
      response.redirect(`/rooms/${roomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      response
        .status(500)
        .json({ message: "Failed to create room. Please try again." });
    }
  }) as RequestHandler
);

// Join room route
router.post(
  "/join/:roomId",
  (async (request: RequestWithSession, response: Response) => {
    const { userId } = request.session;
    console.log("POST /join/:roomId - Session:", { userId, sessionID: request.sessionID });

    if (!userId) {
      console.log("No userId in session");
      return response.redirect("/auth/login");
    }

    const roomId = parseInt(request.params.roomId);
    console.log("Joining room:", roomId);

    try {
      const result = await Room.joinRoom(roomId, userId);
      console.log("Join room result:", result);
      response.redirect(`/rooms/${result.roomId}`);
    } catch (error) {
      console.error("Error joining room:", error);
      handleError(error, "joining room", response);
    }
  }) as RequestHandler
);

// Get room route - must be last to avoid catching other routes
router.get(
  "/:roomId",
  (async (request: RequestWithSession, response: Response) => {
    const { userId } = request.session;
    console.log("GET /:roomId - Session:", { userId, sessionID: request.sessionID });

    if (!userId) {
      console.log("No userId in session, redirecting to login");
      return response.redirect("/auth/login");
    }

    const roomId = parseInt(request.params.roomId);
    if (isNaN(roomId)) {
      console.log("Invalid room ID:", request.params.roomId);
      return response.redirect("/lobby");
    }

    try {
      console.log("Fetching room info for room:", roomId);
      const [roomOwner, roomMaxPlayers, userInfo] = await Promise.all([
        Room.getRoomOwner(roomId),
        Room.getRoomMaxPlayers(roomId),
        User.getById(userId),
      ]);

      console.log("Room info:", {
        roomId,
        roomOwner,
        roomMaxPlayers,
        userInfo,
      });

      if (!roomOwner) {
        console.log("Room not found:", roomId);
        return response.redirect("/lobby");
      }

      if (!userInfo) {
        console.log("User not found:", userId);
        return response.redirect("/auth/login");
      }

      response.render("rooms/waiting-room", {
        roomId,
        isOwner: roomOwner?.id === userId,
        roomMaxPlayersInt: parseInt(roomMaxPlayers.max_players),
        userId,
        username: userInfo.username,
      });
    } catch (error) {
      console.error("Error in GET /:roomId:", error);
      handleError(error, "getting room information", response);
    }
  }) as RequestHandler
);

// Add leave room endpoint
router.post(
  "/:roomId/leave",
  (async (request: RequestWithSession, response: Response) => {
    const { userId } = request.session;
    console.log("POST /:roomId/leave - Session:", { userId, sessionID: request.sessionID });

    if (!userId) {
      console.log("No userId in session");
      response.status(401).json({ message: "Unauthorized. Please log in." });
      return;
    }

    const roomId = parseInt(request.params.roomId);
    if (isNaN(roomId)) {
      console.log("Invalid room ID:", request.params.roomId);
      response.status(400).json({ message: "Invalid room ID format." });
      return;
    }

    try {
      const result = await Room.leave_room(userId, roomId);
      console.log("Leave room result:", result);
      
      if (!result || !result.result) {
        console.warn(`Attempt to leave room ${roomId} by user ${userId} was not successful`);
        response.status(400).json({
          message: "Failed to leave the room. You may not be in this room.",
        });
        return;
      }

      // Check if the room was deleted (owner left)
      if (result.result.deleted) {
        console.log(`Room ${roomId} was deleted by owner ${userId}`);
        response.status(200).json({ 
          message: "Room deleted successfully.",
          roomDeleted: true 
        });
        return;
      }

      // Regular user left
      console.log(`User ${userId} successfully left room ${roomId}`);
      response.status(200).json({ 
        message: "Successfully left the room.",
        roomDeleted: false,
        currentPlayers: result.result.current_players
      });
      return;
    } catch (error) {
      console.error(`Error processing leave room request for user ${userId}, room ${roomId}:`, error);
      response.status(500).json({
        message: "Internal server error while trying to leave the room.",
      });
      return;
    }
  }) as RequestHandler
);

// Add delete room endpoint for room owners
router.post(
  "/:roomId/delete",
  (async (request: RequestWithSession, response: Response) => {
    const { userId } = request.session;
    console.log("POST /:roomId/delete - Session:", { userId, sessionID: request.sessionID });

    if (!userId) {
      console.log("No userId in session");
      return response.status(401).json({ message: "Unauthorized. Please log in." });
    }

    const roomId = parseInt(request.params.roomId);
    if (isNaN(roomId)) {
      console.log("Invalid room ID:", request.params.roomId);
      return response.status(400).json({ message: "Invalid room ID format." });
    }

    try {
      const roomOwner = await Room.getRoomOwner(roomId);
      if (!roomOwner || roomOwner.id !== userId) {
        console.log(`User ${userId} is not the owner of room ${roomId}`);
        return response.status(403).json({ message: "Only the room owner can delete the room." });
      }

      const success = await Room.delete_room(userId, roomId);
      if (success) {
        console.log(`Room ${roomId} successfully deleted by owner ${userId}`);
        response.status(200).json({ message: "Room successfully deleted." });
        return;
      } else {
        console.warn(`Failed to delete room ${roomId} by owner ${userId}`);
        response.status(400).json({
          message: "Failed to delete the room.",
        });
        return;
      }
    } catch (error) {
      console.error(`Error processing delete room request for room ${roomId}:`, error);
      response.status(500).json({
        message: "Internal server error while trying to delete the room.",
      });
      return;
    }
  }) as RequestHandler
);

export default router;
