import express from "express";
import { Request, Response } from "express";

const router = express.Router();

router.get("/", (request: Request, response: Response) => {
  //@ts-ignore
  const userId = request.session.userId; // Get userId from session
  response.render("shared/lobby", { userId }); // Pass userId to the template
});

export default router;
