import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("playerHand", {
    userId: {
      references: '"users"(id)',
      notNull: true,
      type: "integer",
    },
    cardId: {
      references: '"cards"(id)',
      notNull: true,
      type: "integer",
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("playerHand");
}
