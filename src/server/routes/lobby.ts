import express from "express";
import { Request, Response } from "express";
import { Router } from "express";
import { sessionMiddleware } from "../middleware/auth";
import { Room, User } from "../db";

const router = Router();

router.get("/", async (request: Request, response: Response) => {
  const userId = request.session.userId ?? null; // Get userId from session
  const user = userId ? await User.getById(userId) : null;
  const username = user?.username ?? null;

  try {
    const rooms = await Room.getAllRooms();
    response.render("shared/lobby", {
      userId: userId, // Pass userId to the template
      messages: [], // Initial empty messages array
      rooms: rooms, // Pass rooms to the template
      username: username,
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    response.render("shared/lobby", {
      userId: userId,
      username: username,
      messages: [],
      rooms: [],
      error: "Failed to load rooms. Please try again.",
    });
  }
});

export default router;
