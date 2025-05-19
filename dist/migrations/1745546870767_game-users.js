"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(pgm) {
    pgm.createTable("game_users", {
        id: {
            type: "serial",
            primaryKey: true,
        },
        game_id: {
            type: "integer",
            notNull: true,
            references: "games",
            onDelete: "CASCADE",
            comment: "ID of the game",
        },
        user_id: {
            type: "integer",
            notNull: true,
            references: "users",
            onDelete: "CASCADE",
            comment: "ID of the player",
        },
        seat: {
            type: "integer",
            notNull: true,
            comment: "Player's seat number in the game",
        },
        status: {
            type: "varchar(20)",
            notNull: true,
            default: "active",
            comment: "Player status: active, disconnected, eliminated",
        },
        is_current: {
            type: "boolean",
            notNull: true,
            default: false,
            comment: "Whether it's this player's turn",
        },
        cards_remaining: {
            type: "integer",
            notNull: true,
            default: 0,
            comment: "Number of cards remaining in player's hand",
        },
        score: {
            type: "integer",
            notNull: true,
            default: 0,
            comment: "Player's score in this game",
        },
        last_action_time: {
            type: "timestamp",
            comment: "Time of player's last action",
        },
        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("now()"),
        },
        updated_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("now()"),
        },
    });
    pgm.createIndex("game_users", "game_id");
    pgm.createIndex("game_users", "user_id");
    pgm.createIndex("game_users", ["game_id", "user_id"]);
    pgm.createIndex("game_users", "status");
    pgm.createIndex("game_users", "is_current");
    pgm.addConstraint("game_users", "unique_game_user", {
        unique: ["game_id", "user_id"],
    });
    pgm.addConstraint("game_users", "unique_game_seat", {
        unique: ["game_id", "seat"],
    });
}
async function down(pgm) {
    pgm.dropTable("game_users");
}
//# sourceMappingURL=1745546870767_game-users.js.map