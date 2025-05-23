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

// Set up view engine
app.set("views", path.join(process.cwd(), "src", "server", "views"));
app.set("view engine", "ejs");

// Set up CSP headers
app.use((req, res, next) => {
  // In development, allow LiveReload
  if (process.env.NODE_ENV === "development") {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:35729; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:; " +
      "connect-src 'self' ws://localhost:35729 ws://localhost:3000;"
    );
  } else {
    // Production CSP
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data:;"
    );
  }
  next();
});

// Add CORS headers for development
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
  });
}

if (process.env.NODE_ENV !== "production") {
  const reloadServer = livereload.createServer({
    port: 35729,
    exts: ['js', 'css', 'ejs'],
    applyCSSLive: true,
    applyImgLive: true,
    exclusions: [/node_modules/],
    debug: true
  });
  
  reloadServer.watch([
    path.join(process.cwd(), "public"),
    path.join(process.cwd(), "src", "server", "views")
  ]);
  
  reloadServer.server.once("connection", () => {
    setTimeout(() => {
      reloadServer.refresh("/");
    }, 100);
  });
  
  app.use(connectLivereload({
    port: 35729
  }));
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

app.use("/", routes.root);
app.use("/test", routes.test);
app.use("/auth", routes.auth);
app.use("/lobby", sessionMiddleware, routes.lobby);
app.use("/rooms", sessionMiddleware, routes.rooms);
app.use("/games", sessionMiddleware, routes.games);

app.use((_request, _response, next) => {
  next();
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
