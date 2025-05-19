import { MigrationBuilder } from "node-pg-migrate";

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn("users", {
    socket_id: {
      type: "varchar(255)",
      comment: "Current socket.io socket ID for the user",
    },
  });
  pgm.createIndex("users", ["socket_id"]);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn("users", "socket_id");
}
