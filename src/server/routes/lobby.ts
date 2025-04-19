import express from "express";
import { Request, Response } from "express";
import { Router } from 'express';
import { sessionMiddleware } from '../middleware/auth';

const router = Router();

router.get("/", (request: Request, response: Response) => {
  //@ts-ignore
  const userId = request.session.userId; // Get userId from session
  response.render("shared/lobby", {
    userId: userId, // Pass userId to the template
    username: request.session.userID, // Pass the username to the client
    messages: [] // Initial empty messages array
  });
});

export default router;
