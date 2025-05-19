"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const users_1 = __importDefault(require("../db/users"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.get("/", (_request, response) => {
    response.render("root", { title: "Test site" });
});
router.get("/api/me", auth_1.sessionMiddleware, async (request, response) => {
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
//# sourceMappingURL=root.js.map