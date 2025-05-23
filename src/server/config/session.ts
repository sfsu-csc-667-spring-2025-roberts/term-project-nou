import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import "dotenv/config";
import pgp from "pg-promise";

let middleware: RequestHandler | undefined = undefined;

const setupSessions = (app: Express) => {
  if (middleware === undefined) {
    const pgSession = connectPgSimple(session);

    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for session store");
    }

    const sessionSecret = process.env.SESSION_SECRET || "your-secret-key-here";
    const isProduction = process.env.NODE_ENV === "production";

    middleware = session({
      store: new pgSession({
        createTableIfMissing: true,
        conObject: {
          connectionString: process.env.DATABASE_URL,
          ssl: false, // 本地开发时设置为 false
        },
        tableName: "session",
      }),
      secret: sessionSecret,
      resave: true,
      saveUninitialized: true,
      name: "uno.sid",
      cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: "lax",
      },
    });

    app.use(middleware);

    // 添加调试日志
    console.log("Session middleware configured with:", {
      databaseUrl: process.env.DATABASE_URL ? "Set" : "Not Set",
      sessionSecret: sessionSecret ? "Set" : "Not Set",
      environment: process.env.NODE_ENV,
    });
  }
  return middleware;
};

export { setupSessions };
