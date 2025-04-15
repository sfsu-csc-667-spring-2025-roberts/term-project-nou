import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';
import { identity } from 'node-pg-migrate/dist/utils';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("users", {
        id: "id",
        username: {
            type: "varchar(100)",
            notNull: true
        },
        email: {
            type: "varchar(100)",
            notNull: true,
            unique: true
        },
        password: {
            type: "varchar(100)",
            notNull: true,
        },
        winRate: {
            type: "float",
            notNull: true
        },
        createdAt: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("now()")
        }
    });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable("users");
}
