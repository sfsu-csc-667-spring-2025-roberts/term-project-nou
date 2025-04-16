import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("gameState", {
    roomID: {
      references: '"rooms"(id)',
      notNull: true,
      type: "integer",
    },
    currentPlayer: {
      references: '"users"(id)',
      notNull: true,
      type: "integer",
    },
    lastCardPlayed: {
      references: '"cards"(id)',
      notNull: true,
      type: "integer",
    },
    discardPile: {
      type: "integer",
      notNull: true,
    },
    drawPile: {
      type: "integer",
      notNull: true,
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("gameState");
}
