import express from "express";
import { Request, Response } from "express";
import { sessionMiddleware } from "../middleware/auth";
import User from "../db/users";

const router = express.Router();

router.get("/register", async (_request: Request, response: Response) => {
  response.render("auth/register");
});

router.post("/register", async (request: Request, response: Response) => {
  const { username, email, password } = request.body;

  try {
    const userId = await User.register(username, email, password);
    console.log("User registered successfully:", userId);

    request.session.userId = userId;
    console.log("Session after registration:", request.session);

    // Save session before redirect
    request.session.save((err) => {
      if (err) {
        console.error("Error saving session:", err);
        response.render("auth/register", { error: "Session error" });
        return;
      }
      response.redirect("/lobby");
    });
  } catch (error) {
    console.error("Registration error:", error);
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
    console.log("User logged in successfully:", userId);

    request.session.userId = userId;
    console.log("Session after login:", request.session);

    

    // Save session before redirect
    request.session.save((err) => {
      if (err) {
        console.error("Error saving session:", err);
        response.render("auth/login", { error: "Session error" });
        return;
      }

      response.redirect("/lobby");
    });
  } catch (error) {
    console.error("Login error:", error);
    response.render("auth/login", { error: "Invalid email or password" });
  }
});

router.get("/logout", async (request: Request, response: Response) => {
  request.session.destroy(() => {
    response.redirect("/");
  });
});

router.get("/check-session", (request: Request, response: Response) => {
  console.log("Checking session:", request.session);
  if (request.session && request.session.userId) {
    // User is logged in
    response.status(200).json({ loggedIn: true });
  } else {
    // User is not logged in
    response.status(401).json({ loggedIn: false });
  }
});

router.get(
  "/me",
  sessionMiddleware,
  async (request: Request, response: Response): Promise<void> => {
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
