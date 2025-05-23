export const START_GAME_SQL = `
WITH updated_game AS (
  UPDATE games
  SET status = 'playing',
      start_time = NOW()
  WHERE id = $1 AND status = 'waiting'
  RETURNING id
),
gameState AS (
  INSERT INTO gameState (
    game_id,
    status,
    current_player_id,
    direction,
    current_color
  )
  SELECT 
    id,
    'playing',
    (SELECT user_id FROM game_users WHERE game_id = $1 ORDER BY id ASC LIMIT 1),
    'clockwise',
    'red'
  FROM updated_game
  RETURNING game_id
)
SELECT 
  ug.id as game_id,
  gs.game_id as state_id,
  (SELECT initialize_game_cards(ug.id, 7)) as cards_initialized
FROM updated_game ug
JOIN gameState gs ON ug.id = gs.game_id;
`;

export const GET_GAME_STATE_SQL = `
WITH game_info AS (
  SELECT 
    g.id,
    g.status,
    g.winner_id,
    g.start_time,
    g.end_time,
    gs.current_player_id,
    gs.direction,
    gs.current_color,
    gs.last_card_played_id,
    gs.discard_pile_count,
    gs.draw_pile_count,
    gs.last_action_time
  FROM games g
  LEFT JOIN "gameState" gs ON g.id = gs.game_id
  WHERE g.id = $1
),
player_cards AS (
  SELECT 
    gc.game_id,
    gc.player_id,
    json_agg(json_build_object(
      'id', gc.id,
      'type', gc.card_type,
      'color', gc.card_color,
      'value', gc.card_value,
      'position', gc.position
    ) ORDER BY gc.position) as hand
  FROM game_cards gc
  WHERE gc.game_id = $1 AND gc.location = 'hand'
  GROUP BY gc.game_id, gc.player_id
),
discard_pile AS (
  SELECT 
    gc.game_id,
    json_build_object(
      'id', gc.id,
      'type', gc.card_type,
      'color', gc.card_color,
      'value', gc.card_value
    ) as top_card
  FROM game_cards gc
  WHERE gc.game_id = $1 AND gc.location = 'discard'
  ORDER BY gc.position DESC
  LIMIT 1
)
SELECT 
  gi.*,
  COALESCE(
    json_object_agg(
      pc.player_id,
      pc.hand
    ) FILTER (WHERE pc.player_id IS NOT NULL),
    '{}'::json
  ) as player_hands,
  dp.top_card as discard_pile_top
FROM game_info gi
LEFT JOIN player_cards pc ON gi.id = pc.game_id
LEFT JOIN discard_pile dp ON gi.id = dp.game_id
GROUP BY 
  gi.id, gi.status, gi.winner_id, gi.start_time, gi.end_time,
  gi.current_player_id, gi.direction, gi.current_color,
  gi.last_card_played_id, gi.discard_pile_count,
  gi.draw_pile_count, gi.last_action_time,
  dp.top_card;
`;

export const UPDATE_GAME_STATE_SQL = `
UPDATE gameState
SET 
  current_player_id = $2,
  direction = $3,
  current_color = $4,
  last_card_played_id = $5,
  discard_pile_count = $6,
  draw_pile_count = $7,
  last_action_time = NOW(),
  updated_at = NOW()
WHERE game_id = $1
RETURNING *;
`; 