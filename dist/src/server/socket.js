"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = setupSocket;
const socket_io_1 = require("socket.io");
function setupSocket(server) {
    const io = new socket_io_1.Server(server);
    const messages = [];
    const gameRooms = new Map();
    io.on("connection", (socket) => {
        console.log("A user connected");
        socket.emit("chat history", messages);
        socket.on("chat message", (message) => {
            const newMessage = {
                ...message,
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date(),
            };
            messages.push(newMessage);
            io.emit("chat message", newMessage);
        });
    });
    return io;
}
//# sourceMappingURL=socket.js.map