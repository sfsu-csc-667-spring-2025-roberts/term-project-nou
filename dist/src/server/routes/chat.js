"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.sessionMiddleware, (_req, res) => {
    res.render('chat');
});
exports.default = router;
//# sourceMappingURL=chat.js.map