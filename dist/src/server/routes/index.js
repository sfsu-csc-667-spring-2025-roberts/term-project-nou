"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.games = exports.root = exports.test = exports.lobby = exports.auth = exports.chat = void 0;
const chat_1 = __importDefault(require("./chat"));
exports.chat = chat_1.default;
const auth_1 = __importDefault(require("./auth"));
exports.auth = auth_1.default;
const lobby_1 = __importDefault(require("./lobby"));
exports.lobby = lobby_1.default;
const test_1 = __importDefault(require("./test"));
exports.test = test_1.default;
const root_1 = __importDefault(require("./root"));
exports.root = root_1.default;
const games_1 = __importDefault(require("./games"));
exports.games = games_1.default;
//# sourceMappingURL=index.js.map