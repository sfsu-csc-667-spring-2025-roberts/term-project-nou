"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(pgm) {
    pgm.createTable("cards", {
        id: {
            type: "serial",
            primaryKey: true,
        },
        type: {
            type: "varchar(20)",
            notNull: true,
            comment: "Type of card: number, skip, reverse, draw2, wild, wild_draw4",
        },
        value: {
            type: "integer",
            notNull: false,
            comment: "Numeric value for number cards (0-9), null for special cards",
        },
        color: {
            type: "varchar(10)",
            notNull: true,
            comment: "Card color: red, blue, green, yellow, black (for wild cards)",
        },
        points: {
            type: "integer",
            notNull: true,
            comment: "Points value of the card for scoring purposes",
        },
        createdAt: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("now()"),
        },
    });
    const colors = ["red", "blue", "green", "yellow"];
    const cards = [];
    colors.forEach((color) => {
        cards.push({
            type: "number",
            value: 0,
            color: color,
            points: 0,
        });
        for (let i = 1; i <= 9; i++) {
            cards.push({
                type: "number",
                value: i,
                color: color,
                points: i,
            });
            cards.push({
                type: "number",
                value: i,
                color: color,
                points: i,
            });
        }
        for (let i = 0; i < 2; i++) {
            cards.push({
                type: "skip",
                value: null,
                color: color,
                points: 20,
            });
            cards.push({
                type: "reverse",
                value: null,
                color: color,
                points: 20,
            });
            cards.push({
                type: "draw2",
                value: null,
                color: color,
                points: 20,
            });
        }
    });
    for (let i = 0; i < 4; i++) {
        cards.push({
            type: "wild",
            value: null,
            color: "black",
            points: 50,
        });
        cards.push({
            type: "wild_draw4",
            value: null,
            color: "black",
            points: 50,
        });
    }
    const values = cards
        .map((card) => `('${card.type}', ${card.value === null ? "NULL" : card.value}, '${card.color}', ${card.points})`)
        .join(", ");
    pgm.sql(`INSERT INTO cards (type, value, color, points) VALUES ${values};`);
    pgm.createIndex("cards", "type");
    pgm.createIndex("cards", "color");
}
async function down(pgm) {
    pgm.dropTable("cards");
}
//# sourceMappingURL=1744670478395_cards.js.map