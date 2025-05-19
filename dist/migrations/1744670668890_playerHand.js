"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(pgm) {
    pgm.createTable("playerHand", {
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
        card_id: {
            type: "integer",
            notNull: true,
            references: "cards",
            onDelete: "CASCADE",
            comment: "ID of the card in hand",
        },
        card_order: {
            type: "integer",
            notNull: true,
            comment: "Order of the card in player's hand",
        },
        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("now()"),
        },
    });
    pgm.createIndex("playerHand", "game_id");
    pgm.createIndex("playerHand", "user_id");
    pgm.createIndex("playerHand", ["game_id", "user_id"]);
}
async function down(pgm) {
    pgm.dropTable("playerHand");
}
//# sourceMappingURL=1744670668890_playerHand.js.map