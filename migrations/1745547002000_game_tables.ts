import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create game cards table
  pgm.createTable("gameCards", {
    id: {
      type: "serial",
      primaryKey: true,
    },
    game_id: {
      type: "integer",
      notNull: true,
      references: "games",
      onDelete: "CASCADE",
    },
    card_type: {
      type: "varchar(20)",
      notNull: true,
    },
    card_color: {
      type: "varchar(10)",
      notNull: true,
    },
    card_value: {
      type: "varchar(10)",
    },
    location: {
      type: "varchar(20)",
      notNull: true,
      comment: "'draw_pile', 'discard_pile', 'player_hand'",
    },
    player_id: {
      type: "integer",
      references: "users",
      onDelete: "SET NULL",
    },
    position: {
      type: "integer",
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

  // Add indexes
  pgm.createIndex("gameCards", "game_id");
  pgm.createIndex("gameCards", "player_id");
  pgm.createIndex("gameCards", "location");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("gameCards");
} 