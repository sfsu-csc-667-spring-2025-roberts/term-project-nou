"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const router = express_1.default.Router();
router.post("/create", async (request, response) => {
    const userId = request.session.userId;
    if (!userId) {
        return response.redirect("/auth/login");
    }
    const { roomId } = request.body;
    try {
        const gameId = await db_1.Game.create(parseInt(roomId));
        response.redirect(`/games/${gameId}`);
    }
    catch (error) {
        console.log({ error });
        response.redirect("/lobby");
    }
});
router.post("/join", async (request, response) => {
    const { gameId } = request.body;
    const userId = request.session.userId;
    if (!userId) {
        return response.redirect("/auth/login");
    }
    try {
        const playerCount = await db_1.Game.join(userId, parseInt(gameId));
        console.log({ playerCount });
        response.redirect(`/games/${gameId}`);
    }
    catch (error) {
        console.log({ error });
        response.redirect("/lobby");
    }
});
router.get("/:gameId/players", async (request, response) => {
    const { gameId } = request.params;
    try {
        const players = await db_1.Game.getPlayers(parseInt(gameId));
        response.json(players);
    }
    catch (error) {
        console.log({ error });
        response.status(500).json({ error: "Failed to get players" });
    }
});
router.get("/:gameId", (request, response) => {
    const { gameId } = request.params;
    response.render("games/waiting-room", { gameId });
});
router.post("/:gameId/leave", async (request, response) => {
    const userId = request.session.userId;
    const { gameId } = request.params;
    if (!userId) {
        response.status(401).json({ message: "Unauthorized. Please log in." });
        return;
    }
    const gameIdNum = parseInt(gameId, 10);
    if (isNaN(gameIdNum)) {
        response.status(400).json({ message: "Invalid game ID format." });
        return;
    }
    try {
        const success = await db_1.Game.leave(userId, gameIdNum);
        if (success) {
            console.log(`User ${userId} successfully left game ${gameIdNum}`);
            response.status(200).json({ message: "Successfully left the game." });
            return;
        }
        else {
            console.warn(`Attempt to leave game ${gameIdNum} by user ${userId} was not successful (e.g., not in game).`);
            response.status(400).json({
                message: "Failed to leave the game. You may not be in this game.",
            });
            return;
        }
    }
    catch (error) {
        console.error(`Error processing leave game request for user ${userId}, game ${gameIdNum}:`, error);
        response.status(500).json({
            message: "Internal server error while trying to leave the game.",
        });
        return;
    }
});
router.post("/:gameId/start", async (request, response) => {
    const { gameId } = request.params;
    try {
        const game = await db_1.Game.start(parseInt(gameId, 10));
        response.status(200).json({ message: "Game started successfully", game });
    }
    catch (error) {
        console.error(`Error starting game ${gameId}:`, error);
        response.status(500).json({ message: "Failed to start the game" });
    }
});
exports.default = router;
//# sourceMappingURL=games.js.map