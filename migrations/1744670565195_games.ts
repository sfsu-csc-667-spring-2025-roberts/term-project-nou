import { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("games", {
    id: {
      type: "serial",
      primaryKey: true,
    },
    room_id: {
      type: "integer",
      notNull: true,
      references: "rooms",
      onDelete: "CASCADE",
      comment: "ID of the room where this game is being played",
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "waiting",
      comment: "Game status: waiting, playing, finished",
    },
    winner_id: {
      type: "integer",
      references: "users",
      comment: "ID of the winning player",
    },
    start_time: {
      type: "timestamp",
      comment: "When the game started",
    },
    end_time: {
      type: "timestamp",
      comment: "When the game ended",
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

  // Add indexes for faster queries
  pgm.createIndex("games", "room_id");
  pgm.createIndex("games", "status");
  pgm.createIndex("games", "winner_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("games");
}
