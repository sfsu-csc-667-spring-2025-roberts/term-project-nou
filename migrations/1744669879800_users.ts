import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("users", {
    id: {
      type: "serial",
      primaryKey: true,
    },
    username: {
      type: "varchar(50)",
      notNull: true,
      unique: true,
    },
    email: {
      type: "varchar(100)",
      notNull: true,
      unique: true,
    },
    password: {
      type: "varchar(100)",
      notNull: true,
    },
    // Game statistics
    gamesPlayed: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Total number of games played by the user",
    },
    gamesWon: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Total number of games won by the user",
    },
    winRate: {
      type: "float",
      notNull: true,
      default: 0,
      comment: "Win rate calculated as gamesWon/gamesPlayed",
    },
    totalScore: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Total score accumulated across all games",
    },
    // User status and preferences
    isOnline: {
      type: "boolean",
      notNull: true,
      default: false,
      comment: "Whether the user is currently online",
    },
    lastActive: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("now()"),
      comment: "Last time the user was active",
    },
    createdAt: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("now()"),
    },
    updatedAt: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  // Add index for faster queries
  pgm.createIndex("users", "username");
  pgm.createIndex("users", "email");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("users");
}
