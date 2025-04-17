import { NextFunction, Request, Response } from "express";
import session from "express-session";

declare module "express-session" {
  interface SessionData {
    userID?: string;
  }
}

const sessionMiddleware = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  //@ts-ignore
  console.log("Session ID: ", request.session.userID);
  next();
  //   if (request.session.userID !== undefined) {
  //     //@ts-ignore
  //     response.locals.userId = request.session.userId;
  //     next();
  //   } else {
  //     response.redirect("/auth/login");
  //   }
};

export { sessionMiddleware };
