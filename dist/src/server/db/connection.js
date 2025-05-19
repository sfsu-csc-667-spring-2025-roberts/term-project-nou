"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_promise_1 = __importDefault(require("pg-promise"));
const connection = (0, pg_promise_1.default)()(process.env.DATABASE_URL);
exports.default = connection;
//# sourceMappingURL=connection.js.map