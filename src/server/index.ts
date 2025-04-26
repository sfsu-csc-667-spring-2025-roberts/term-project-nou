import * as path from "path";
import { createServer } from "http";

import cookieParser from "cookie-parser";
import express from "express";
import httpErrors from "http-errors";
import morgan from "morgan";

import livereload from "livereload";
import connectLivereload from "connect-livereload";

import { setupSessions } from "./config/session";
import { setupSocket } from "./socket";

import dotenv from "dotenv";
dotenv.config();

const app = express();
const server = createServer(app);
const io = setupSocket(server);

if (process.env.NODE_ENV !== "production") {
  const reloadServer = livereload.createServer();
  reloadServer.watch(path.join(process.cwd(), "public", "js"));
  reloadServer.server.once("connection", () => {
    setTimeout(() => {
      reloadServer.refresh("/");
    }, 100);
  });
  app.use(connectLivereload());
}

setupSessions(app);

import * as routes from "./routes";
import { sessionMiddleware } from "./middleware/auth";

const PORT = process.env.PORT || 3000;

app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(process.cwd(), "public")));
app.set("views", path.join(process.cwd(), "src", "server", "views"));
app.set("view engine", "ejs");

app.use("/", routes.root);
app.use("/test", routes.test);
app.use("/auth", routes.auth);
app.use("/lobby", sessionMiddleware, routes.lobby);
app.use("/games", sessionMiddleware, routes.games);

app.use((_request, _response, next) => {
  next();
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
