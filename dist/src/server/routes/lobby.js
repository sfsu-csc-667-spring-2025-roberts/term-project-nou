"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.get("/", (request, response) => {
    const userId = request.session.userId;
    response.render("shared/lobby", {
        userId: userId,
        messages: [],
    });
});
exports.default = router;
//# sourceMappingURL=lobby.js.map