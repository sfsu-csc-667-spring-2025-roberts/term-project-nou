import express from "express";
import { Request, Response } from "express";

import User from "../db/users";

const router = express.Router();

router.get("/register", async (_request: Request, response: Response) => {
  response.render("auth/register");
});

router.post("/register", async (request: Request, response: Response) => {
  const { username, email, password } = request.body;

  try {
    const userId = await User.register(username, email, password);

    //@ts-ignore
    request.session.userId = userId;

    response.redirect("/lobby");
  } catch (error) {
    response.render("auth/register", { error: error });
  }
});

router.get("/login", async (_request: Request, response: Response) => {
  response.render("auth/login");
});

router.post("/login", async (request: Request, response: Response) => {
  const { email, password } = request.body;

  try {
    const userId = await User.login(email, password);

    //@ts-ignore
    request.session.userId = userId;

    response.redirect("/lobby");
  } catch (error) {
    response.render("auth/login", { error: "Invalid email or password" });
  }
});

router.get("/logout", async (request: Request, response: Response) => {
  request.session.destroy(() => {
    response.redirect("/");
  });
});

router.get("/check-session", (request: Request, response: Response) => {
  //@ts-ignore
  if (request.session && request.session.userId) {
    // User is logged in
    response.status(200).json({ loggedIn: true });
  } else {
    // User is not logged in
    response.status(401).json({ loggedIn: false });
  }
});

export default router;
