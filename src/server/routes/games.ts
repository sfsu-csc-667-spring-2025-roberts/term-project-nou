import express from "express";
import { Request, Response } from "express";

const router = express.Router();

router.get("/", (request: Request, response: Response) => {
  const userId = request.session.userId;
  if (!userId) {
    return response.redirect("/auth/login");
  }
  response.render("games/game-board", {
    userId,
    gameId: 1,
  });
});

export default router;
