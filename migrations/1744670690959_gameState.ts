import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("gameState", {
    id: {
      type: "serial",
      primaryKey: true,
    },
    game_id: {
      type: "integer",
      notNull: true,
      references: "games",
      onDelete: "CASCADE",
      comment: "ID of the game",
    },
    status: {
      type: "varchar(20)",
      notNull: true,
      default: "waiting",
      comment: "Game status: waiting, playing, finished",
    },
    current_player_id: {
      type: "integer",
      notNull: true,
      references: "users",
      comment: "ID of the current player",
    },
    direction: {
      type: "varchar(10)",
      notNull: true,
      default: "clockwise",
      comment: "Game direction: clockwise, counterclockwise",
    },
    current_color: {
      type: "varchar(10)",
      notNull: true,
      default: "red",
      comment: "Current color in play (for wild cards)",
    },
    last_card_played_id: {
      type: "integer",
      references: "cards",
      comment: "ID of the last card played",
    },
    discard_pile_count: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Number of cards in discard pile",
    },
    draw_pile_count: {
      type: "integer",
      notNull: true,
      default: 0,
      comment: "Number of cards in draw pile",
    },
    last_action_time: {
      type: "timestamp",
      notNull: true,
      default: pgm.func("now()"),
      comment: "Time of the last game action",
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
  pgm.createIndex("gameState", "game_id");
  pgm.createIndex("gameState", "current_player_id");
  pgm.createIndex("gameState", "status");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("gameState");
}
