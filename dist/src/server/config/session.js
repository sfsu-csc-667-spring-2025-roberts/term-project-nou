"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSessions = void 0;
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const express_session_1 = __importDefault(require("express-session"));
let middleware = undefined;
const setupSessions = (app) => {
    if (middleware === undefined) {
        const pgSession = (0, connect_pg_simple_1.default)(express_session_1.default);
        middleware = (0, express_session_1.default)({
            store: new pgSession({
                createTableIfMissing: true,
            }),
            secret: process.env.SESSION_SECRET,
            resave: true,
            saveUninitialized: false,
        });
        app.use(middleware);
    }
    return middleware;
};
exports.setupSessions = setupSessions;
//# sourceMappingURL=session.js.map