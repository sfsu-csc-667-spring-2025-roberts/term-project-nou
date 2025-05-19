"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.END_GAME_SQL = exports.UPDATE_GAME_STATE_SQL = exports.GET_GAME_STATE_SQL = exports.START_GAME_SQL = exports.LEAVE_GAME_SQL = exports.GET_PLAYERS_SQL = exports.CONDITIONALLY_JOIN_SQL = exports.ADD_PLAYER = exports.CREATE_SQL = void 0;
exports.CREATE_SQL = `
INSERT INTO games (room_id, status) 
VALUES ($1, 'waiting') 
RETURNING id`;
exports.ADD_PLAYER = `
INSERT INTO game_users (game_id, user_id) 
VALUES ($1, $2)`;
exports.CONDITIONALLY_JOIN_SQL = `
INSERT INTO game_users (game_id, user_id)
SELECT $(gameId), $(userId) 
WHERE NOT EXISTS (
  SELECT 'value-doesnt-matter' 
  FROM game_users 
  WHERE game_id=$(gameId) AND user_id=$(userId)
)
AND (
  SELECT COUNT(*) FROM games WHERE id=$(gameId) AND status='waiting'
) = 1
AND (
  (
    SELECT COUNT(*) FROM game_users WHERE game_id=$(gameId)
  ) < (
    SELECT r.max_players FROM rooms r
    JOIN games g ON g.room_id = r.id
    WHERE g.id=$(gameId)
  )
)
RETURNING (
  SELECT COUNT(*) AS playerCount FROM game_users WHERE game_id=$(gameId)
)
`;
exports.GET_PLAYERS_SQL = `
SELECT u.id, u.username, u.email, gu.game_id AS game_user_id
FROM users u
JOIN game_users gu ON u.id = gu.user_id
WHERE gu.game_id = $(gameId)
`;
exports.LEAVE_GAME_SQL = `
DELETE FROM game_users
WHERE game_id = $(gameId) AND user_id = $(userId)
RETURNING *;
`;
exports.START_GAME_SQL = `
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
exports.GET_GAME_STATE_SQL = `
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
exports.UPDATE_GAME_STATE_SQL = `
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
exports.END_GAME_SQL = `
UPDATE games
SET 
  status = 'finished',
  winner_id = $2,
  end_time = NOW(),
  updated_at = NOW()
WHERE id = $1
RETURNING *;
`;
//# sourceMappingURL=sql.js.map