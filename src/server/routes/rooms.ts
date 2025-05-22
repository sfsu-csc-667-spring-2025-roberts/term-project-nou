import express, { RequestHandler } from "express";
import { Request, Response } from "express";
import { Room, User } from "../db";
import session from "express-session";

const router = express.Router();

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

router.post(
  "/create-room",
  (async (request: RequestWithSession, response: Response) => {
    const { userId } = request.session;
    if (!userId) {
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

    try {
      // Validate input
      if (!name || !maxPlayers) {
        return response
          .status(400)
          .json({ message: "Room name and max players are required." });
      }

      if (isPrivate === "true" && !password) {
        return response
          .status(400)
          .json({ message: "Password is required for private rooms." });
      }

      const roomId = await Room.createRoom(userId, {
        name,
        maxPlayers: parseInt(maxPlayers),
        isPrivate: isPrivate === "true",
        password: isPrivate === "true" ? password : null,
        startingCards: parseInt(startingCards) || 7,
        drawUntilPlayable: drawUntilPlayable || false,
        stacking: stacking || false,
      });

      response.json({ roomId });
    } catch (error) {
      console.error("Error creating room:", error);
      response
        .status(500)
        .json({ message: "Failed to create room. Please try again." });
    }
  }) as RequestHandler
);

router.post(
  "/join/:roomId",
  (async (request: RequestWithSession, response: Response) => {
    const { userId } = request.session;
    if (!userId) {
      return response.redirect("/auth/login");
    }

    const roomId = parseInt(request.params.roomId);

    try {
      const result = await Room.joinRoom(roomId, userId);
      response.redirect(`/rooms/${result.roomId}`);
    } catch (error) {
      handleError(error, "joining room", response);
    }
  }) as RequestHandler
);

router.get(
  "/:roomId",
  (async (request: RequestWithSession, response: Response) => {
    const { userId } = request.session;
    if (!userId) {
      return response.redirect("/auth/login");
    }

    const roomId = parseInt(request.params.roomId);

    try {
      const [roomOwner, roomMaxPlayers, userInfo] = await Promise.all([
        Room.getRoomOwner(roomId),
        Room.getRoomMaxPlayers(roomId),
        User.getById(userId),
      ]);

      response.render("rooms/waiting-room", {
        roomId,
        isOwner: roomOwner?.id === userId,
        roomMaxPlayersInt: parseInt(roomMaxPlayers.max_players),
        userId,
        username: userInfo.username,
      });
    } catch (error) {
      handleError(error, "getting room information", response);
    }
  }) as RequestHandler
);

router.post(
  "/:roomId/leave",
  (async (request: RequestWithSession, response: Response) => {
    const { userId } = request.session;
    if (!userId) {
      return response
        .status(401)
        .json({ message: "Unauthorized. Please log in." });
    }

    const roomId = parseInt(request.params.roomId);
    if (isNaN(roomId)) {
      return response.status(400).json({ message: "Invalid room ID format." });
    }

    try {
      const success = await Room.leave_room(userId, roomId);
      if (success) {
        return response.redirect("/lobby");
      }
      return response.status(400).json({
        message: "Failed to leave the room. You may not be in this room.",
      });
    } catch (error) {
      handleError(error, "leaving room", response);
    }
  }) as RequestHandler
);

router.post(
  "/:roomId/delete",
  (async (request: RequestWithSession, response: Response) => {
    const { userId } = request.session;
    if (!userId) {
      return response
        .status(401)
        .json({ message: "Unauthorized. Please log in." });
    }

    const roomId = parseInt(request.params.roomId);
    if (isNaN(roomId)) {
      return response.status(400).json({ message: "Invalid room ID format." });
    }

    try {
      const success = await Room.delete_room(userId, roomId);
      if (success) {
        return response
          .status(200)
          .json({ message: "Successfully deleted the room." });
      }
      return response.status(400).json({
        message: "Failed to delete the room. You may not be the room owner.",
      });
    } catch (error) {
      handleError(error, "deleting room", response);
    }
  }) as RequestHandler
);

export default router;
