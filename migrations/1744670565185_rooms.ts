import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("rooms", {
        id: "id",
        numPlayers: {
            type: "integer",
            notNull: true
        },
        rules: {
            type: "enum",
            notNull: true
        }
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable("rooms");
}
