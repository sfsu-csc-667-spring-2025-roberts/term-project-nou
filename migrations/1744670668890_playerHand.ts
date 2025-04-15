import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("playerHand", {
        userId: {
            type: "FK",
            notNull: true
        },
        cardId: {
            type: "FK",
            notNull: true
        }
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable("playerHand");
}
