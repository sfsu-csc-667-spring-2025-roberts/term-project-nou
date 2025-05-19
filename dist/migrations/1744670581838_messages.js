"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(pgm) {
    pgm.createTable("messages", {
        id: {
            type: "serial",
            primaryKey: true,
        },
        content: {
            type: "text",
            notNull: true,
            comment: "Message content",
        },
        type: {
            type: "varchar(20)",
            notNull: true,
            default: "chat",
            comment: "Message type: chat, system, game_action",
        },
        sender_id: {
            type: "integer",
            notNull: true,
            references: "users",
            onDelete: "CASCADE",
            comment: "ID of the message sender",
        },
        room_id: {
            type: "integer",
            references: "rooms",
            onDelete: "CASCADE",
            comment: "ID of the room where message was sent",
        },
        game_id: {
            type: "integer",
            references: "games",
            onDelete: "CASCADE",
            comment: "ID of the game if message is game-related",
        },
        is_global: {
            type: "boolean",
            notNull: true,
            default: false,
            comment: "Whether this is a global message",
        },
        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("now()"),
        },
    });
    pgm.createIndex("messages", "sender_id");
    pgm.createIndex("messages", "room_id");
    pgm.createIndex("messages", "game_id");
    pgm.createIndex("messages", "created_at");
}
async function down(pgm) {
    pgm.dropTable("messages");
}
//# sourceMappingURL=1744670581838_messages.js.map