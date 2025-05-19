// SQL statements for the messages table

export const INSERT_MESSAGE_SQL = `
  INSERT INTO messages (content, type, sender_id, room_id, game_id, is_global)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING *;
`;

export const GET_MESSAGES_BY_ROOM_SQL = `
  SELECT m.*, u.username
  FROM messages m
  JOIN users u ON m.sender_id = u.id
  WHERE m.room_id = $1
  ORDER BY m.id ASC;
`;

export const GET_MESSAGES_BY_GAME_SQL = `
  SELECT m.*, u.username
  FROM messages m
  JOIN users u ON m.sender_id = u.id
  WHERE m.game_id = $1
  ORDER BY m.id ASC;
`;

export const GET_GLOBAL_MESSAGES_SQL = `
  SELECT m.*, u.username
  FROM messages m
  JOIN users u ON m.sender_id = u.id
  WHERE is_global = true
  ORDER BY m.id ASC;
`;
