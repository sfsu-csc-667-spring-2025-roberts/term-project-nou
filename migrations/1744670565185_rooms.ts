import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("rooms", {
    id: {
      type: "serial",
      primaryKey: true,
    },
    name: {
      type: "varchar(50)",
      notNull: true,
      comment: "Name of the game room",
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "waiting",
      comment: "Room status: waiting, playing, finished",
    },
    max_players: {
      type: "integer",
      notNull: true,
      default: 4,
      comment: "Maximum number of players allowed in the room",
    },
    current_players: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Current number of players in the room",
    },
    // Game settings
    starting_cards: {
      type: "integer",
      notNull: true,
      default: 7,
      comment: "Number of cards each player starts with",
    },
    draw_until_playable: {
      type: "boolean",
      notNull: true,
      default: false,
      comment: "Whether players must draw until they can play",
    },
    stacking: {
      type: "boolean",
      notNull: true,
      default: false,
      comment: "Whether draw cards can be stacked",
    },
    // Room management
    created_by: {
      type: "integer",
      notNull: true,
      references: "users",
      comment: "User ID of the room creator",
    },
    is_private: {
      type: "boolean",
      notNull: true,
      default: false,
      comment: "Whether this is a private room",
    },
    password: {
      type: "varchar(255)",
      comment: "Password for private rooms",
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
  pgm.createIndex("rooms", "status");
  pgm.createIndex("rooms", "created_by");
  pgm.createIndex("rooms", "is_private");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("rooms");
}
