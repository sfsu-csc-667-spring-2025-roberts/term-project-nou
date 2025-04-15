import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
    pgm.createTable("cards", {
        id: "id",
        value: {
            type: "integer",
            notNull: true
        },
        color: {
            type: "varchar(100)",
            notNull: true
        }
    });

    var color = ["red", "blue", "green", "yellow"];
    const cards = [];
    for(let i = 0; i < 4; i++){
        for(let j = 1; j <= 25; j++){
            const val = Math.floor(j / 2);
            cards.push({value: val, color: color[i]});
        }
        cards.push({value: 26, color: color[i]});
        cards.push({value: 27, color: color[i]});
    }

    pgm.sql(
        'INSERT INTO cards (value, color) VALUES ${cards.map((value, color) => "(${value.value}, ${color.color})".join(","))};'
    );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
    pgm.dropTable("cards");
}
