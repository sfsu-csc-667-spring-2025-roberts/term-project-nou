"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = __importDefault(require("../connection"));
const sql_1 = require("./sql");
const create = async (roomId) => {
    const { id: gameId } = await connection_1.default.one(sql_1.CREATE_SQL, [roomId]);
    return gameId;
};
const join = async (userId, gameId) => {
    const { playerCount } = await connection_1.default.one(sql_1.CONDITIONALLY_JOIN_SQL, {
        gameId,
        userId,
    });
    return playerCount;
};
const getPlayers = async (gameId) => {
    return await connection_1.default.manyOrNone(sql_1.GET_PLAYERS_SQL, { gameId });
};
const leave = async (userId, gameId) => {
    return await connection_1.default.oneOrNone(sql_1.LEAVE_GAME_SQL, { userId, gameId });
};
const start = async (gameId) => {
    return await connection_1.default.one(sql_1.START_GAME_SQL, [gameId]);
};
const getGameState = async (gameId) => {
    return await connection_1.default.oneOrNone(sql_1.GET_GAME_STATE_SQL, [gameId]);
};
const updateGameState = async (gameId, currentPlayerId, direction, currentColor, lastCardPlayedId, discardPileCount, drawPileCount) => {
    return await connection_1.default.one(sql_1.UPDATE_GAME_STATE_SQL, [
        gameId,
        currentPlayerId,
        direction,
        currentColor,
        lastCardPlayedId,
        discardPileCount,
        drawPileCount,
    ]);
};
const endGame = async (gameId, winnerId) => {
    return await connection_1.default.one(sql_1.END_GAME_SQL, [gameId, winnerId]);
};
exports.default = {
    create,
    join,
    getPlayers,
    leave,
    start,
    getGameState,
    updateGameState,
    endGame,
};
//# sourceMappingURL=index.js.map