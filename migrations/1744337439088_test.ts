//import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';
import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable('test_table', {
        id: "id",
        create_at: {type: "timestamp", notNull: true, default: pgm.func("now()")},
        test_string: {type: "varchar(1000)", notNull: true}
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable("test_table");
}
