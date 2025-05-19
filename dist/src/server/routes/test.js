"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const connection_1 = __importDefault(require("../db/connection"));
const router = express_1.default.Router();
router.get("/", async (_request, response) => {
    try {
        connection_1.default.none("INSERT INTO test_table (test_string) VALUES ($1)", ['Test string ${new Date().toISOString()}']);
        response.json(await connection_1.default.any("SELECT * FROM test_table"));
    }
    catch (error) {
        console.error(error);
    }
});
exports.default = router;
//# sourceMappingURL=test.js.map