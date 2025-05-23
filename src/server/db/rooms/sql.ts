export const CREATE_ROOM_SQL = `
INSERT INTO rooms (
  name,
  status,
  max_players,
  current_players,
  created_by,
  is_private,
  password,
  starting_cards,
  draw_until_playable,
  stacking
) VALUES (
  $1, -- name
  'waiting',
  $2, -- max_players
  1,  -- current_players
  $3, -- created_by
  $4, -- is_private
  $5, -- password
  $6, -- starting_cards
  $7, -- draw_until_playable
  $8  -- stacking
)
RETURNING id`;

export const CREATE_SQL = `
INSERT INTO rooms (room_id, status) 
SELECT $1, 'waiting'
FROM rooms r
WHERE r.id = $1 AND r.created_by = $2
RETURNING id`;

export const ADD_PLAYER = `
WITH added_player AS (
  INSERT INTO room_users (room_id, user_id) 
  VALUES ($1, $2)
  RETURNING *
)
UPDATE rooms
SET current_players = current_players + 1
WHERE id = $1
RETURNING *;
`;

export const GET_PLAYERS_SQL = `
SELECT u.id, u.username, u.email, gu.room_id AS room_user_id
FROM users u
JOIN room_users gu ON u.id = gu.user_id
WHERE gu.room_id = $(roomId)
`;

export const LEAVE_ROOM_SQL = `
WITH user_info AS (
  SELECT r.created_by, r.id, r.current_players, r.status
  FROM rooms r
  WHERE r.id = $(roomId)
),
deleted_membership AS (
  DELETE FROM room_users
  WHERE room_id = $(roomId) AND user_id = $(userId)
  RETURNING *
),
game_cleanup AS (
  DELETE FROM "game_users"
  WHERE game_id IN (
    SELECT id FROM games WHERE room_id = $(roomId)
  ) AND user_id = $(userId)
  RETURNING *
),
room_deletion AS (
  DELETE FROM rooms
  WHERE id = $(roomId) 
  AND EXISTS (
    SELECT 1 FROM user_info 
    WHERE created_by = $(userId)
  )
  RETURNING *
),
updated_room AS (
  UPDATE rooms
  SET current_players = current_players - 1
  WHERE id = $(roomId)
  AND EXISTS (SELECT 1 FROM deleted_membership)
  AND NOT EXISTS (SELECT 1 FROM room_deletion)
  RETURNING id, current_players, status
)
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM room_deletion) THEN 
      json_build_object('deleted', true)
    WHEN EXISTS (SELECT 1 FROM deleted_membership) THEN 
      json_build_object(
        'deleted', false,
        'id', (SELECT id FROM updated_room),
        'current_players', (SELECT current_players FROM updated_room),
        'status', (SELECT status FROM updated_room)
      )
    ELSE NULL
  END as result;
`;

export const DELETE_ROOM_SQL = `
DELETE FROM rooms
WHERE id = $(roomId) AND created_by = $(userId)
RETURNING *;
`;

export const RESET_ROOM_SQL = `
UPDATE rooms
SET status = 'waiting'
WHERE id = $1
RETURNING id, status, current_players;
`;

export const START_room_SQL = `
WITH room_check AS (
  SELECT id, status, current_players
  FROM rooms
  WHERE id = $1
),
updated_room AS (
  UPDATE rooms
  SET status = 'playing'
  WHERE id = $1 
  AND status = 'waiting'
  AND EXISTS (SELECT 1 FROM room_check)
  AND (SELECT current_players FROM room_check) >= 2
  RETURNING id, status, current_players
),
new_game AS (
  INSERT INTO games (
    room_id,
    status,
    start_time
  )
  SELECT 
    id,
    'active',
    NOW()
  FROM updated_room
  WHERE EXISTS (SELECT 1 FROM updated_room)
  RETURNING id
),
add_players AS (
  INSERT INTO "game_users" (game_id, user_id, seat, status)
  SELECT 
    ng.id,
    ru.user_id,
    ROW_NUMBER() OVER (ORDER BY ru.joined_at),
    'active'
  FROM new_game ng
  CROSS JOIN room_users ru
  WHERE ru.room_id = $1
  RETURNING game_id
)
SELECT 
  ng.id,
  (SELECT status FROM room_check) as previous_status, 
  (SELECT current_players FROM room_check) as player_count,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM room_check) THEN 'room_not_found'
    WHEN (SELECT status FROM room_check) != 'waiting' THEN 'invalid_status'
    WHEN (SELECT current_players FROM room_check) < 2 THEN 'insufficient_players'
    ELSE 'success'
  END as result
FROM new_game ng;
`;

export const GET_room_STATE_SQL = `
SELECT 
  r.id,
  r.status,
  r.winner_id,
  r.start_time,
  r.end_time,
  gs.current_player_id,
  gs.direction,
  gs.current_color,
  gs.last_card_played_id,
  gs.discard_pile_count,
  gs.draw_pile_count,
  gs.last_action_time
FROM rooms r
LEFT JOIN gameState gs ON r.id = gs.game_id
WHERE r.id = $1;
`;

export const UPDATE_room_STATE_SQL = `
UPDATE roomState
SET 
  current_player_id = $2,
  direction = $3,
  current_color = $4,
  last_card_played_id = $5,
  discard_pile_count = $6,
  draw_pile_count = $7,
  last_action_time = NOW(),
  updated_at = NOW()
WHERE room_id = $1
RETURNING *;
`;

export const END_room_SQL = `
UPDATE rooms
SET 
  status = 'finished',
  winner_id = $2,
  end_time = NOW(),
  updated_at = NOW()
WHERE id = $1
RETURNING *;
`;

export const GET_ROOM_USERS_SQL = `
SELECT u.id, u.username, u.email, u.socket_id, ru.room_id, ru.joined_at
FROM room_users ru
JOIN users u ON ru.user_id = u.id
WHERE ru.room_id = $1
ORDER BY ru.joined_at ASC;
`;

export const GET_ROOM_OWNER_SQL = `
SELECT u.id, u.username
FROM rooms r
JOIN users u ON r.created_by = u.id
WHERE r.id = $1
LIMIT 1;
`;

export const GET_ROOM_MAX_PLAYERS_SQL = `
SELECT max_players
FROM rooms
WHERE id = $1;
`;

export const GET_ALL_ROOMS_SQL = `
SELECT 
  r.id,
  r.name,
  r.status,
  r.max_players,
  r.current_players,
  r.is_private,
  r.created_at
FROM rooms r
JOIN users u ON r.created_by = u.id
ORDER BY r.created_at DESC;
`;

export const UPDATE_SOCKET_ID_SQL = `
UPDATE room_users
SET socket_id = $1
WHERE room_id = $2 AND user_id = $3
RETURNING *;
`;
