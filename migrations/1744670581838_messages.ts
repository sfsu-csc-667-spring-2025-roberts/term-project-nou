import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("messages", {
    messages: {
      type: "varchar(100)",
      notNull: true,
    },
    createdAt: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("now()"),
    },
    sender: {
      type: "integer",
      notNull: true,
      references: '"users"(id)',
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    global: {
      type: "boolean",
      notNull: true,
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("messages");
}
