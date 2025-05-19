"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeMiddleware = void 0;
const timeMiddleware = (request, response, next) => {
    console.log(`Time: ${new Date()}`);
    next();
};
exports.timeMiddleware = timeMiddleware;
//# sourceMappingURL=time.js.map