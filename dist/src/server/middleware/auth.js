"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionMiddleware = void 0;
const sessionMiddleware = (request, response, next) => {
    console.log("Session ID: ", request.session.userId);
    next();
};
exports.sessionMiddleware = sessionMiddleware;
//# sourceMappingURL=auth.js.map