"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.up = up;
exports.down = down;
async function up(pgm) {
    pgm.createTable('test_table', {
        id: "id",
        create_at: { type: "timestamp", notNull: true, default: pgm.func("now()") },
        test_string: { type: "varchar(1000)", notNull: true }
    });
}
async function down(pgm) {
    pgm.dropTable("test_table");
}
//# sourceMappingURL=1744337439088_test.js.map