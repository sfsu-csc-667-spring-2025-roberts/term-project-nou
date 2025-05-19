export const UPDATE_SOCKET_ID_SQL = `
UPDATE users
SET socket_id = $1
WHERE id = $2
RETURNING *;
`;
