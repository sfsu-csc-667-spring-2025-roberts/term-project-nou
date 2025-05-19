"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const users_1 = __importDefault(require("../db/users"));
const router = express_1.default.Router();
router.get("/register", async (_request, response) => {
    response.render("auth/register");
});
router.post("/register", async (request, response) => {
    const { username, email, password } = request.body;
    try {
        const userId = await users_1.default.register(username, email, password);
        request.session.userId = userId;
        response.redirect("/lobby");
    }
    catch (error) {
        response.render("auth/register", { error: error });
    }
});
router.get("/login", async (_request, response) => {
    response.render("auth/login");
});
router.post("/login", async (request, response) => {
    const { email, password } = request.body;
    try {
        const userId = await users_1.default.login(email, password);
        request.session.userId = userId;
        response.redirect("/lobby");
    }
    catch (error) {
        response.render("auth/login", { error: "Invalid email or password" });
    }
});
router.get("/logout", async (request, response) => {
    request.session.destroy(() => {
        response.redirect("/");
    });
});
router.get("/check-session", (request, response) => {
    if (request.session && request.session.userId) {
        response.status(200).json({ loggedIn: true });
    }
    else {
        response.status(401).json({ loggedIn: false });
    }
});
router.get("/me", auth_1.sessionMiddleware, async (request, response) => {
    const userId = request.session.userId;
    if (!userId) {
        response.status(401).json({ error: "Not authenticated" });
        return;
    }
    try {
        const user = await users_1.default.getById(userId);
        response.json(user);
    }
    catch (error) {
        console.error("Error fetching user:", error);
        response.status(500).json({ error: "Failed to fetch user data" });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map