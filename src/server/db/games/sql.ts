export const START_GAME_SQL = `
WITH updated_game AS (
  UPDATE games
  SET status = 'playing',
      start_time = NOW()
  WHERE id = $1 AND status = 'waiting'
  RETURNING id
)
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
RETURNING game_id;
`;

export const GET_GAME_STATE_SQL = `
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
LEFT JOIN gameState gs ON g.id = gs.game_id
WHERE g.id = $1;
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