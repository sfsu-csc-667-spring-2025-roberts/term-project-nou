import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder) => {
  // Create game_cards table
  pgm.createTable('game_cards', {
    id: { type: 'serial', primaryKey: true },
    game_id: { type: 'integer', notNull: true, references: 'games', onDelete: 'CASCADE' },
    card_type: { type: 'text', notNull: true }, // 'number', 'action', 'wild'
    card_color: { type: 'text', notNull: true }, // 'red', 'blue', 'green', 'yellow', 'black'
    card_value: { type: 'text', notNull: true }, // '0-9', 'skip', 'reverse', 'draw2', 'wild', 'wild4'
    location: { type: 'text', notNull: true }, // 'deck', 'hand', 'discard'
    player_id: { type: 'integer', references: 'users' },
    position: { type: 'integer' }, // Position in hand/deck
    created_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') },
    updated_at: { type: 'timestamp', notNull: true, default: pgm.func('CURRENT_TIMESTAMP') }
  });

  // Add indexes for better query performance
  pgm.createIndex('game_cards', 'game_id');
  pgm.createIndex('game_cards', 'player_id');
  pgm.createIndex('game_cards', 'location');

  // Create function to initialize game cards
  pgm.createFunction(
    'initialize_game_cards',
    [
      { name: 'p_game_id', type: 'integer' },
      { name: 'p_player_ids', type: 'integer[]' }
    ],
    {
      replace: true,
      language: 'plpgsql',
      returns: 'void'
    },
    `
    DECLARE
      v_color text;
      v_value integer;
      v_action text;
      v_wild text;
      v_player_id integer;
      v_position integer;
    BEGIN
      -- Add number cards (0-9)
      FOREACH v_color IN ARRAY ARRAY['red', 'blue', 'green', 'yellow'] LOOP
        FOR v_value IN 0..9 LOOP
          -- Add two of each number card (except 0)
          FOR i IN 1..2 LOOP
            IF v_value > 0 OR i = 1 THEN
              INSERT INTO game_cards (game_id, card_type, card_color, card_value, location)
              VALUES (p_game_id, 'number', v_color, v_value::text, 'deck');
            END IF;
          END LOOP;
        END LOOP;
      END LOOP;

      -- Add action cards (skip, reverse, draw2)
      FOREACH v_color IN ARRAY ARRAY['red', 'blue', 'green', 'yellow'] LOOP
        FOREACH v_action IN ARRAY ARRAY['skip', 'reverse', 'draw2'] LOOP
          -- Add two of each action card
          FOR i IN 1..2 LOOP
            INSERT INTO game_cards (game_id, card_type, card_color, card_value, location)
            VALUES (p_game_id, 'action', v_color, v_action, 'deck');
          END LOOP;
        END LOOP;
      END LOOP;

      -- Add wild cards (wild, wild4)
      FOREACH v_wild IN ARRAY ARRAY['wild', 'wild4'] LOOP
        -- Add four of each wild card
        FOR i IN 1..4 LOOP
          INSERT INTO game_cards (game_id, card_type, card_color, card_value, location)
          VALUES (p_game_id, 'wild', 'black', v_wild, 'deck');
        END LOOP;
      END LOOP;

      -- Shuffle the deck
      UPDATE game_cards
      SET position = floor(random() * 1000)
      WHERE game_id = p_game_id AND location = 'deck';

      -- Deal cards to players
      FOREACH v_player_id IN ARRAY p_player_ids LOOP
        FOR v_position IN 1..7 LOOP
          -- Get a card from the deck
          WITH card AS (
            SELECT id
            FROM game_cards
            WHERE game_id = p_game_id AND location = 'deck'
            ORDER BY position
            LIMIT 1
            FOR UPDATE
          )
          UPDATE game_cards
          SET location = 'hand',
              player_id = v_player_id,
              position = v_position
          WHERE id = (SELECT id FROM card);
        END LOOP;
      END LOOP;

      -- Move first card to discard pile
      WITH first_card AS (
        SELECT id, card_type, card_color
        FROM game_cards
        WHERE game_id = p_game_id AND location = 'deck'
        ORDER BY position
        LIMIT 1
        FOR UPDATE
      )
      UPDATE game_cards
      SET location = 'discard',
          position = 1
      WHERE id = (SELECT id FROM first_card);

      -- If first card is wild, change its color
      UPDATE game_cards
      SET card_color = 'red'
      WHERE id IN (
        SELECT id FROM game_cards
        WHERE game_id = p_game_id
        AND location = 'discard'
        AND card_type = 'wild'
      );
    END;
    `
  );
};

export const down = (pgm: MigrationBuilder) => {
  pgm.dropFunction('initialize_game_cards', [
    { name: 'p_game_id', type: 'integer' },
    { name: 'p_player_ids', type: 'integer[]' }
  ]);
  pgm.dropTable('game_cards');
}; 