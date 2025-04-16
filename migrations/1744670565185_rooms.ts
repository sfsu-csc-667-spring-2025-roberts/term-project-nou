import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("rooms", {
    // changed enum to varchar
    id: {
      type: "serial",
      primaryKey: true,
    },
    numPlayers: {
      type: "integer",
      notNull: true,
    },
    rules: {
      type: "varchar(50)", // or 'text'
      notNull: true,
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("rooms");
}
