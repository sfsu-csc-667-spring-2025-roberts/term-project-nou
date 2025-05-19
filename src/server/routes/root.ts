import express from "express";
import { Request, Response } from "express";
import User from "../db/users";
import { sessionMiddleware } from "../middleware/auth";

const router = express.Router();

router.get("/", (_request, response) => {
  response.render("root", { title: "Test site" });
});

router.get(
  "/api/me",
  sessionMiddleware,
  async (request: Request, response: Response) => {
    //@ts-ignore
    const userId = request.session.userId;

    if (!userId) {
      response.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      const user = await User.getById(userId);
      response.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      response.status(500).json({ error: "Failed to fetch user data" });
    }
  }
);

export default router;
