import { NextFunction, Request, Response } from "express";
import session from "express-session";

declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const sessionMiddleware = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  console.log("Session middleware check:", {
    path: request.path,
    sessionID: request.sessionID,
    userId: request.session.userId,
  });

  if (request.session.userId !== undefined) {
    response.locals.userId = request.session.userId;
    next();
  } else {
    console.log("No active session, redirecting to login");
    response.redirect("/auth/login");
  }
};

export { sessionMiddleware };
