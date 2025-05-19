"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = __importDefault(require("../connection"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const register = async (username, email, password) => {
    const encryptedPassword = await bcrypt_1.default.hash(password, 10);
    const { id } = await connection_1.default.one("INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id", [username, email, encryptedPassword]);
    return id;
};
const login = async (email, password) => {
    const user = await connection_1.default.one("SELECT * FROM users WHERE email = $1", [
        email,
    ]);
    const passwordsMatch = await bcrypt_1.default.compare(password, user.password);
    if (passwordsMatch) {
        return user.id;
    }
    else {
        throw new Error("Failed to login");
    }
};
const getById = async (id) => {
    const user = await connection_1.default.one("SELECT id, username, email FROM users WHERE id = $1", [id]);
    return user;
};
exports.default = { register, login, getById };
//# sourceMappingURL=index.js.map