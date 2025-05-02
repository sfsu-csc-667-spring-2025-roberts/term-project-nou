export const CREATE_SQL = `
INSERT INTO games (name, min_players, max_players, password) 
VALUES ($1, $2, $3, $4) 
RETURNING id`;

export const ADD_PLAYER = `
INSERT INTO game_users (game_id, user_id) 
VALUES ($1, $2)`;

export const CONDITIONALLY_JOIN_SQL = `
INSERT INTO game_users (game_id, user_id)
SELECT $(gameId), $(userId) 
WHERE NOT EXISTS (
  SELECT 'value-doesnt-matter' 
  FROM game_users 
  WHERE game_id=$(gameId) AND user_id=$(userId)
)
AND (
  SELECT COUNT(*) FROM games WHERE id=$(gameId) AND password=$(password)
) = 1
AND (
  (
    SELECT COUNT(*) FROM game_users WHERE game_id=$(gameId)
  ) < (
    SELECT max_players FROM games WHERE id=$(gameId)
  )
)
RETURNING (
  SELECT COUNT(*) AS playerCount FROM game_users WHERE game_id=$(gameId)
)
`;

export const GET_PLAYERS_SQL = `
SELECT u.id, u.username, u.email, gu.game_id AS game_user_id
FROM users u
JOIN game_users gu ON u.id = gu.user_id
WHERE gu.game_id = $(gameId)
`;

export const START_GAME_SQL = `
WITH first_player AS (
  SELECT user_id 
  FROM game_users 
  WHERE game_id = $(gameId) 
  ORDER BY seat ASC 
  LIMIT 1
),
new_room AS (
  INSERT INTO "rooms" ("numPlayers", "rules")
  SELECT 
    (SELECT COUNT(*) FROM game_users WHERE game_id = $(gameId)),
    'standard'
  RETURNING id
)
INSERT INTO "gameState" ("roomID", "currentPlayer", "lastCardPlayed", "discardPile", "drawPile")
SELECT 
  (SELECT id FROM new_room),
  (SELECT user_id FROM first_player),
  (SELECT id FROM cards ORDER BY RANDOM() LIMIT 1),
  0,
  (SELECT COUNT(*) FROM cards)
RETURNING "roomID"`;

export const INITIALIZE_PLAYER_HANDS_SQL = `
INSERT INTO "playerHand" ("userId", "cardId")
SELECT 
  gu.user_id,
  c.id
FROM game_users gu
CROSS JOIN (
  SELECT id FROM cards ORDER BY RANDOM() LIMIT 7
) c
WHERE gu.game_id = $(gameId)`;

export const GET_GAME_STATE_SQL = `
SELECT 
  gs.*,
  c.color,
  c.value
FROM "gameState" gs
JOIN cards c ON gs."lastCardPlayed" = c.id
WHERE gs."roomID" = $(gameId)`;

export const GET_PLAYERS_CARDS_SQL = `
SELECT 
  u.id as user_id,
  u.username,
  c.id as card_id,
  c.value,
  c.color
FROM game_users gu
JOIN users u ON gu.user_id = u.id
JOIN "playerHand" ph ON ph."userId" = u.id
JOIN cards c ON c.id = ph."cardId"
WHERE gu.game_id = $(gameId)
ORDER BY u.id, c.id`;
