"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(pgm) {
    pgm.createTable("users", {
        id: {
            type: "serial",
            primaryKey: true,
        },
        username: {
            type: "varchar(50)",
            notNull: true,
            unique: true,
        },
        email: {
            type: "varchar(100)",
            notNull: true,
            unique: true,
        },
        password: {
            type: "varchar(100)",
            notNull: true,
        },
        gamesPlayed: {
            type: "integer",
            notNull: true,
            default: 0,
            comment: "Total number of games played by the user",
        },
        gamesWon: {
            type: "integer",
            notNull: true,
            default: 0,
            comment: "Total number of games won by the user",
        },
        winRate: {
            type: "float",
            notNull: true,
            default: 0,
            comment: "Win rate calculated as gamesWon/gamesPlayed",
        },
        totalScore: {
            type: "integer",
            notNull: true,
            default: 0,
            comment: "Total score accumulated across all games",
        },
        isOnline: {
            type: "boolean",
            notNull: true,
            default: false,
            comment: "Whether the user is currently online",
        },
        lastActive: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("now()"),
            comment: "Last time the user was active",
        },
        createdAt: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("now()"),
        },
        updatedAt: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("now()"),
        },
    });
    pgm.createIndex("users", "username");
    pgm.createIndex("users", "email");
}
async function down(pgm) {
    pgm.dropTable("users");
}
//# sourceMappingURL=1744669879800_users.js.map