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
INSERT INTO room_users (room_id, user_id) 
VALUES ($1, $2)`;

export const GET_PLAYERS_SQL = `
SELECT u.id, u.username, u.email, gu.room_id AS room_user_id
FROM users u
JOIN room_users gu ON u.id = gu.user_id
WHERE gu.room_id = $(roomId)
`;

export const LEAVE_ROOM_SQL = `
DELETE FROM room_users
WHERE room_id = $(roomId) AND user_id = $(userId)
RETURNING *;
`;

export const DELETE_ROOM_SQL = `
DELETE FROM rooms
WHERE id = $(roomId) AND created_by = $(userId)
RETURNING *;
`;

export const START_room_SQL = `
WITH updated_room AS (
  UPDATE rooms
  SET status = 'playing',
      start_time = NOW()
  WHERE id = $1 AND status = 'waiting'
  RETURNING id
)
INSERT INTO roomState (
  room_id,
  status,
  current_player_id,
  direction,
  current_color
)
SELECT 
  id,
  'playing',
  (SELECT user_id FROM room_users WHERE room_id = $1 ORDER BY id ASC LIMIT 1),
  'clockwise',
  'red'
FROM updated_room
RETURNING room_id;
`;

export const GET_room_STATE_SQL = `
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
FROM rooms g
LEFT JOIN roomState gs ON g.id = gs.room_id
WHERE g.id = $1;
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
WHERE r.id = $1;
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
