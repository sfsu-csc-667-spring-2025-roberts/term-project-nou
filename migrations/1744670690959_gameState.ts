import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("gameState", {
        roomID: {
            type: "FK",
            notNull: true
        },
        currentPlayer: {
            type: "FK",
            notNull: true
        },
        lastCardPlayed: {
            type: "FK",
            notNull: true
        },
        discardPile: {
            type: "integer",
            notNull: true
        },
        drawPile: {
            type: "integer",
            notNull: true
        }
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable("gameState");
}
