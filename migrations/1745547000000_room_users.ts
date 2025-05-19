import { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("room_users", {
    id: { type: "serial", primaryKey: true },
    room_id: {
      type: "integer",
      notNull: true,
      references: "rooms(id)",
      onDelete: "CASCADE",
    },
    user_id: {
      type: "integer",
      notNull: true,
      references: "users(id)",
      onDelete: "CASCADE",
    },
    joined_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("room_users", ["room_id"]);
  pgm.createIndex("room_users", ["user_id"]);
  pgm.addConstraint("room_users", "room_users_room_id_user_id_unique", {
    unique: ["room_id", "user_id"],
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("room_users");
}
