import db from "../connection";
import { User } from "../users";
import {
  ADD_PLAYER,
  CREATE_SQL,
  GET_PLAYERS_SQL,
  LEAVE_ROOM_SQL,
  DELETE_ROOM_SQL,
  START_room_SQL,
  GET_room_STATE_SQL,
  UPDATE_room_STATE_SQL,
  END_room_SQL,
  CREATE_ROOM_SQL,
  GET_ROOM_USERS_SQL,
  GET_ALL_ROOMS_SQL,
  GET_ROOM_OWNER_SQL,
  GET_ROOM_MAX_PLAYERS_SQL,
  UPDATE_SOCKET_ID_SQL,
  RESET_ROOM_SQL,
} from "./sql";

interface roomState {
  id: number;
  status: string;
  winner_id: number | null;
  start_time: Date | null;
  end_time: Date | null;
  current_player_id: number;
  direction: string;
  current_color: string;
  last_card_played_id: number | null;
  discard_pile_count: number;
  draw_pile_count: number;
  last_action_time: Date;
}

interface RoomSettings {
  name: string;
  maxPlayers: number;
  isPrivate: boolean;
  password?: string | null;
  startingCards: number;
  drawUntilPlayable: boolean;
  stacking: boolean;
}

const createRoom = async (userId: number, settings: RoomSettings) => {
  console.log("Creating room with settings:", { userId, settings });
  
  try {
    const { id: roomId } = await db.one<{ id: number }>(CREATE_ROOM_SQL, [
      settings.name,
      settings.maxPlayers,
      userId,
      settings.isPrivate,
      settings.password,
      settings.startingCards,
      settings.drawUntilPlayable,
      settings.stacking,
    ]);

    console.log("Room created with ID:", roomId);

    await db.none(
      "INSERT INTO room_users (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [roomId, userId]
    );

    console.log("User added to room:", { roomId, userId });
    return roomId;
  } catch (error) {
    console.error("Error in createRoom:", error);
    throw error;
  }
};

const joinRoom = async (roomId: number, userId: number) => {
  console.log(`Attempting to join room ${roomId} for user ${userId}`);
  
  // First check if user is already in the target room
  const existingRoomMembership = await db.oneOrNone(
    `
    SELECT r.*, 
           (SELECT COUNT(*) FROM room_users WHERE room_id = r.id) as current_players
    FROM rooms r
    JOIN room_users ru ON r.id = ru.room_id
    WHERE ru.user_id = $1 AND r.id = $2
    `,
    [userId, roomId]
  );

  console.log('Existing room membership:', existingRoomMembership);

  // If user is already in the target room, return that room info
  if (existingRoomMembership) {
    return {
      alreadyInRoom: true,
      roomId: existingRoomMembership.id,
      roomInfo: existingRoomMembership,
    };
  }

  // Check if user is in any other room and leave it
  const otherRooms = await db.manyOrNone(
    `SELECT room_id FROM room_users WHERE user_id = $1`,
    [userId]
  );

  if (otherRooms.length > 0) {
    // Delete all room memberships for this user
    await db.none("DELETE FROM room_users WHERE user_id = $1", [userId]);
    
    // Update current_players count for all rooms this user was in
    await db.none(
      `UPDATE rooms 
       SET current_players = current_players - 1 
       WHERE id = ANY($1)`,
      [otherRooms.map(r => r.room_id)]
    );
  }

  // Check if target room exists and can be joined
  const targetRoom = await db.oneOrNone(
    `
    SELECT r.*,
           (SELECT COUNT(*) FROM room_users WHERE room_id = r.id) as current_players
    FROM rooms r
    WHERE r.id = $1
    `,
    [roomId]
  );

  console.log('Target room:', targetRoom);

  // Check if room exists
  if (!targetRoom) {
    throw new Error("Room does not exist");
  }

  // Check if room is full
  if (targetRoom.current_players >= targetRoom.max_players) {
    throw new Error("Room is full");
  }

  // Join the room
  console.log(`Joining room ${roomId}`);
  await db.none("INSERT INTO room_users (room_id, user_id) VALUES ($1, $2)", [
    roomId,
    userId,
  ]);

  // Update room's current_players count
  await db.none(
    "UPDATE rooms SET current_players = current_players + 1 WHERE id = $1",
    [roomId]
  );

  // Get updated room info
  const updatedRoom = await db.one(
    `
    SELECT r.*,
           (SELECT COUNT(*) FROM room_users WHERE room_id = r.id) as current_players
    FROM rooms r
    WHERE r.id = $1
    `,
    [roomId]
  );

  console.log('Updated room:', updatedRoom);

  // Return updated room info
  return {
    alreadyInRoom: false,
    roomId: roomId,
    roomInfo: updatedRoom,
  };
};

const getPlayers = async (roomId: number) => {
  return await db.manyOrNone(GET_PLAYERS_SQL, { roomId });
};

const leave_room = async (userId: number, roomId: number) => {
  return await db.oneOrNone(LEAVE_ROOM_SQL, { userId, roomId });
};

const delete_room = async (userId: number, roomId: number) => {
  return await db.oneOrNone(DELETE_ROOM_SQL, { userId, roomId });
};

const start = async (roomId: number) => {
  // Log the room status and player count before attempting to start
  const roomInfo = await db.oneOrNone(
    `SELECT id, status, current_players FROM rooms WHERE id = $1`,
    [roomId]
  );
  console.log('[Room.start] Room info before start:', roomInfo);

  if (!roomInfo) {
    throw new Error('Room not found');
  }

  if (roomInfo.status !== 'waiting') {
    throw new Error('Room is not in waiting status');
  }

  if (roomInfo.current_players < 2) {
    throw new Error('Not enough players to start the game');
  }

  // Start the game and get the game ID
  const result = await db.oneOrNone(START_room_SQL, [roomId]);
  if (!result) {
    throw new Error('Failed to start game');
  }

  console.log('[Room.start] Game started with result:', result);

  // Get the first player to be the current player
  const firstPlayer = await db.oneOrNone(
    `SELECT user_id FROM room_users WHERE room_id = $1 ORDER BY id ASC LIMIT 1`,
    [roomId]
  );

  if (!firstPlayer) {
    throw new Error('No players found in room');
  }

  console.log('[Room.start] First player:', firstPlayer);

  // Initialize the game state
  try {
    const gameState = await db.one(
      `INSERT INTO "gameState" (
        game_id,
        status,
        current_player_id,
        direction,
        current_color,
        discard_pile_count,
        draw_pile_count,
        last_action_time
      ) VALUES ($1, 'playing', $2, 'clockwise', 'red', 0, 0, NOW())
      RETURNING *`,
      [result.id, firstPlayer.user_id]
    );
    console.log('[Room.start] Game state initialized:', gameState);
    return result;
  } catch (error) {
    console.error('[Room.start] Error creating game state:', error);
    // If game state creation fails, we should clean up the game
    await db.none('DELETE FROM games WHERE id = $1', [result.id]);
    throw new Error('Failed to create game state');
  }
};

const getroomState = async (roomId: number): Promise<roomState | null> => {
  return await db.oneOrNone(GET_room_STATE_SQL, [roomId]);
};

const updateroomState = async (
  roomId: number,
  currentPlayerId: number,
  direction: string,
  currentColor: string,
  lastCardPlayedId: number | null,
  discardPileCount: number,
  drawPileCount: number
) => {
  return await db.one(UPDATE_room_STATE_SQL, [
    roomId,
    currentPlayerId,
    direction,
    currentColor,
    lastCardPlayedId,
    discardPileCount,
    drawPileCount,
  ]);
};

const endroom = async (roomId: number, winnerId: number) => {
  return await db.one(END_room_SQL, [roomId, winnerId]);
};

const getRoomUsers = async (roomId: number) => {
  return await db.manyOrNone(GET_ROOM_USERS_SQL, [roomId]);
};

const getRoomOwner = async (roomId: number) => {
  return await db.oneOrNone(GET_ROOM_OWNER_SQL, [roomId]);
};

const getRoomMaxPlayers = async (roomId: number) => {
  return await db.oneOrNone(GET_ROOM_MAX_PLAYERS_SQL, [roomId]);
};

const getAllRooms = async () => {
  return await db.manyOrNone(GET_ALL_ROOMS_SQL);
};

const updateSocketId = async (
  roomId: number,
  userId: number,
  socketId: string
) => {
  return await db.oneOrNone(UPDATE_SOCKET_ID_SQL, [socketId, roomId, userId]);
};

export const startGame = async (roomId: number) => {
  try {
    // First check the current room state
    const roomState = await db.oneOrNone(
      `SELECT id, status, current_players FROM rooms WHERE id = $1`,
      [roomId]
    );
    console.log("Current room state:", roomState);

    if (!roomState) {
      throw new Error(`Room ${roomId} does not exist`);
    }

    // If room is already in playing state, reset it first
    if (roomState.status === 'playing') {
      console.log("Room is already in playing state, resetting to waiting...");
      const resetResult = await db.one(RESET_ROOM_SQL, [roomId]);
      console.log("Room reset result:", resetResult);
    } else if (roomState.status !== 'waiting') {
      throw new Error(`Cannot start game: Room is in ${roomState.status} state`);
    }

    if (roomState.current_players < 2) {
      throw new Error(`Cannot start game: Need at least 2 players (current: ${roomState.current_players})`);
    }

    // Start the game and get the game ID
    const gameResult = await db.one(START_room_SQL, [roomId]);
    console.log("Game started with result:", gameResult);

    if (!gameResult.id) {
      throw new Error(`Failed to start game: Room ${roomId} is not in waiting state or doesn't exist`);
    }

    // Add all players to the game
    await db.none(
      `INSERT INTO "game_users" (game_id, user_id, seat, status)
       SELECT 
         $1,
         ru.user_id,
         ROW_NUMBER() OVER (ORDER BY ru.joined_at),
         'active'
       FROM room_users ru
       WHERE ru.room_id = $2`,
      [gameResult.id, roomId]
    );
    console.log("Added players to game:", gameResult.id);

    // Get the first player to be the current player
    const firstPlayer = await db.one(
      `SELECT user_id FROM room_users WHERE room_id = $1 ORDER BY id ASC LIMIT 1`,
      [roomId]
    );
    console.log("First player:", firstPlayer);

    // Initialize the game state
    const gameState = await db.one(
      `INSERT INTO "gameState" (
        game_id,
        status,
        current_player_id,
        direction,
        current_color,
        discard_pile_count,
        draw_pile_count,
        last_action_time
      ) VALUES ($1, 'playing', $2, 'clockwise', 'red', 0, 0, NOW())
      RETURNING *`,
      [gameResult.id, firstPlayer.user_id]
    );
    console.log("Game state initialized:", gameState);

    // Initialize the deck
    const deckResult = await db.one(
      `WITH card_types AS (
         SELECT unnest(ARRAY['number', 'skip', 'reverse', 'draw2', 'wild', 'wild_draw4']) as card_type
       ),
       colors AS (
         SELECT unnest(ARRAY['red', 'blue', 'green', 'yellow']) as card_color
       ),
       numbers AS (
         SELECT unnest(ARRAY['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) as card_value
       ),
       regular_cards AS (
         SELECT 
           'number' as card_type,
           c.card_color,
           n.card_value
         FROM colors c
         CROSS JOIN numbers n
         UNION ALL
         SELECT 
           'skip' as card_type,
           c.card_color,
           NULL as card_value
         FROM colors c
         UNION ALL
         SELECT 
           'reverse' as card_type,
           c.card_color,
           NULL as card_value
         FROM colors c
         UNION ALL
         SELECT 
           'draw2' as card_type,
           c.card_color,
           NULL as card_value
         FROM colors c
       ),
       wild_cards AS (
         SELECT 
           'wild' as card_type,
           'black' as card_color,
           NULL as card_value
         FROM generate_series(1, 4)
         UNION ALL
         SELECT 
           'wild_draw4' as card_type,
           'black' as card_color,
           NULL as card_value
         FROM generate_series(1, 4)
       ),
       all_cards AS (
         SELECT * FROM regular_cards
         UNION ALL
         SELECT * FROM wild_cards
       ),
       inserted_cards AS (
         INSERT INTO "gameCards" (game_id, card_type, card_color, card_value, location, position)
         SELECT 
           $1 as game_id,
           card_type,
           card_color,
           card_value,
           'deck' as location,
           ROW_NUMBER() OVER (ORDER BY RANDOM()) as position
         FROM all_cards
         RETURNING id
       )
       SELECT COUNT(*) as card_count FROM inserted_cards`,
      [gameResult.id]
    );
    console.log("Deck initialized with", deckResult.card_count, "cards");

    // Deal cards to players
    const players = await getRoomUsers(roomId);
    for (const player of players) {
      const dealResult = await db.one(
        `WITH random_cards AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as pos
          FROM (
            SELECT id
            FROM "gameCards"
            WHERE game_id = $1
            AND location = 'deck'
            ORDER BY RANDOM()
            LIMIT 7
          ) selected_cards
        ),
        updated_cards AS (
          UPDATE "gameCards" gc
          SET location = 'hand',
              player_id = $2,
              position = rc.pos
          FROM random_cards rc
          WHERE gc.id = rc.id
          RETURNING gc.id
        )
        SELECT COUNT(*) as dealt_count FROM updated_cards`,
        [gameResult.id, player.id]
      );
      console.log(`Dealt ${dealResult.dealt_count} cards to player ${player.id}`);
    }

    // Draw first card to discard pile
    const discardResult = await db.one(
      `WITH first_card AS (
        SELECT id, card_type, card_color, card_value
        FROM "gameCards"
        WHERE game_id = $1
        AND location = 'deck'
        ORDER BY RANDOM()
        LIMIT 1
      ),
      updated_card AS (
        UPDATE "gameCards" gc
        SET location = 'discard',
            position = 1
        WHERE gc.id IN (SELECT id FROM first_card)
        RETURNING gc.id, gc.card_type, gc.card_color, gc.card_value
      )
      SELECT 
        (SELECT COUNT(*) FROM updated_card) as discard_count,
        (SELECT json_build_object(
          'id', id,
          'type', card_type,
          'color', card_color,
          'value', card_value
        ) FROM updated_card) as top_card`,
      [gameResult.id]
    );
    console.log("First card drawn to discard pile:", discardResult);

    // Update game state with card counts and initial color
    await db.none(
      `UPDATE "gameState"
       SET 
         discard_pile_count = 1,
         draw_pile_count = (
           SELECT COUNT(*) 
           FROM "gameCards" 
           WHERE game_id = $1 AND location = 'deck'
         ),
         current_color = $2,
         status = 'playing',
         last_action_time = NOW()
       WHERE game_id = $1`,
      [gameResult.id, discardResult.top_card.color]
    );

    // Verify card distribution
    const cardDistribution = await db.one(
      `SELECT 
        COUNT(*) FILTER (WHERE location = 'deck') as deck_count,
        COUNT(*) FILTER (WHERE location = 'hand') as hand_count,
        COUNT(*) FILTER (WHERE location = 'discard') as discard_count
       FROM "gameCards"
       WHERE game_id = $1`,
      [gameResult.id]
    );
    console.log("Card distribution:", cardDistribution);

    // Get all players in the room with their hands
    const playersWithHands = await db.manyOrNone(
      `SELECT 
         u.id,
         u.username,
         u.email,
         u.socket_id,
         ru.room_id,
         ru.joined_at,
         json_agg(
           json_build_object(
             'id', gc.id,
             'type', gc.card_type,
             'color', gc.card_color,
             'value', gc.card_value
           )
         ) as hand
       FROM room_users ru
       JOIN users u ON ru.user_id = u.id
       LEFT JOIN "gameCards" gc ON gc.game_id = $1 AND gc.location = 'hand' AND gc.player_id = u.id
       WHERE ru.room_id = $2
       GROUP BY u.id, u.username, u.email, u.socket_id, ru.room_id, ru.joined_at
       ORDER BY ru.joined_at ASC`,
      [gameResult.id, roomId]
    );
    console.log("Players with hands:", playersWithHands);

    // Get the top card of the discard pile
    const topCard = await db.oneOrNone(
      `SELECT 
         id,
         card_type,
         card_color as color,
         card_value as value
       FROM "gameCards"
       WHERE game_id = $1
       AND location = 'discard'
       ORDER BY position DESC
       LIMIT 1`,
      [gameResult.id]
    );
    console.log("Top card:", topCard);

    return {
      gameId: gameResult.id,
      players: playersWithHands,
      currentPlayer: firstPlayer.user_id,
      direction: 'clockwise',
      currentColor: topCard.color,
      topCard: topCard,
      status: 'playing'
    };
  } catch (error) {
    console.error(`Error starting game in room ${roomId}:`, error);
    // Type check the error object
    if (error && typeof error === 'object') {
      if ('code' in error && error.code === '42P01') {
        console.error("Table 'gameState' does not exist. Please run migrations.");
      } else if ('message' in error) {
        console.error("Error message:", error.message);
      }
    }
    return null;
  }
};

export const Room = {
  joinRoom,
  getPlayers,
  leave_room,
  delete_room,
  start,
  getroomState,
  updateroomState,
  endroom,
  createRoom,
  getRoomUsers,
  getRoomOwner,
  getAllRooms,
  getRoomMaxPlayers,
  updateSocketId,
  startGame,
  start_room: async (roomId: number, userId: number) => {
    try {
      // First check the current room state
      const roomState = await db.oneOrNone(
        `SELECT id, status, current_players FROM rooms WHERE id = $1`,
        [roomId]
      );
      console.log("Current room state:", roomState);

      if (!roomState) {
        throw new Error(`Room ${roomId} does not exist`);
      }

      // If room is already in playing state, reset it first
      if (roomState.status === 'playing') {
        console.log("Room is already in playing state, resetting to waiting...");
        const resetResult = await db.one(RESET_ROOM_SQL, [roomId]);
        console.log("Room reset result:", resetResult);
      } else if (roomState.status !== 'waiting') {
        throw new Error(`Cannot start game: Room is in ${roomState.status} state`);
      }

      if (roomState.current_players < 2) {
        throw new Error(`Cannot start game: Need at least 2 players (current: ${roomState.current_players})`);
      }

      // Start the game and get the game ID
      const gameResult = await db.one(START_room_SQL, [roomId]);
      console.log("Game started with result:", gameResult);

      if (!gameResult.id) {
        throw new Error(`Failed to start game: Room ${roomId} is not in waiting state or doesn't exist`);
      }

      // Add all players to the game
      await db.none(
        `INSERT INTO "game_users" (game_id, user_id, seat, status)
         SELECT 
           $1,
           ru.user_id,
           ROW_NUMBER() OVER (ORDER BY ru.joined_at),
           'active'
         FROM room_users ru
         WHERE ru.room_id = $2`,
        [gameResult.id, roomId]
      );
      console.log("Added players to game:", gameResult.id);

      // Get the first player to be the current player
      const firstPlayer = await db.one(
        `SELECT user_id FROM room_users WHERE room_id = $1 ORDER BY id ASC LIMIT 1`,
        [roomId]
      );
      console.log("First player:", firstPlayer);

      // Initialize the game state
      const gameState = await db.one(
        `INSERT INTO "gameState" (
          game_id,
          status,
          current_player_id,
          direction,
          current_color,
          discard_pile_count,
          draw_pile_count,
          last_action_time
        ) VALUES ($1, 'playing', $2, 'clockwise', 'red', 0, 0, NOW())
        RETURNING *`,
        [gameResult.id, firstPlayer.user_id]
      );
      console.log("Game state initialized:", gameState);

      // Initialize the deck
      const deckResult = await db.one(
        `WITH card_types AS (
           SELECT unnest(ARRAY['number', 'skip', 'reverse', 'draw2', 'wild', 'wild_draw4']) as card_type
         ),
         colors AS (
           SELECT unnest(ARRAY['red', 'blue', 'green', 'yellow']) as card_color
         ),
         numbers AS (
           SELECT unnest(ARRAY['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']) as card_value
         ),
         regular_cards AS (
           SELECT 
             'number' as card_type,
             c.card_color,
             n.card_value
           FROM colors c
           CROSS JOIN numbers n
           UNION ALL
           SELECT 
             'skip' as card_type,
             c.card_color,
             NULL as card_value
           FROM colors c
           UNION ALL
           SELECT 
             'reverse' as card_type,
             c.card_color,
             NULL as card_value
           FROM colors c
           UNION ALL
           SELECT 
             'draw2' as card_type,
             c.card_color,
             NULL as card_value
           FROM colors c
         ),
         wild_cards AS (
           SELECT 
             'wild' as card_type,
             'black' as card_color,
             NULL as card_value
           FROM generate_series(1, 4)
           UNION ALL
           SELECT 
             'wild_draw4' as card_type,
             'black' as card_color,
             NULL as card_value
           FROM generate_series(1, 4)
         ),
         all_cards AS (
           SELECT * FROM regular_cards
           UNION ALL
           SELECT * FROM wild_cards
         ),
         inserted_cards AS (
           INSERT INTO "gameCards" (game_id, card_type, card_color, card_value, location, position)
           SELECT 
             $1 as game_id,
             card_type,
             card_color,
             card_value,
             'deck' as location,
             ROW_NUMBER() OVER (ORDER BY RANDOM()) as position
           FROM all_cards
           RETURNING id
         )
         SELECT COUNT(*) as card_count FROM inserted_cards`,
        [gameResult.id]
      );
      console.log("Deck initialized with", deckResult.card_count, "cards");

      // Deal cards to players
      const players = await getRoomUsers(roomId);
      for (const player of players) {
        const dealResult = await db.one(
          `WITH random_cards AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY RANDOM()) as pos
            FROM (
              SELECT id
              FROM "gameCards"
              WHERE game_id = $1
              AND location = 'deck'
              ORDER BY RANDOM()
              LIMIT 7
            ) selected_cards
          ),
          updated_cards AS (
            UPDATE "gameCards" gc
            SET location = 'hand',
                player_id = $2,
                position = rc.pos
            FROM random_cards rc
            WHERE gc.id = rc.id
            RETURNING gc.id
          )
          SELECT COUNT(*) as dealt_count FROM updated_cards`,
          [gameResult.id, player.id]
        );
        console.log(`Dealt ${dealResult.dealt_count} cards to player ${player.id}`);
      }

      // Draw first card to discard pile
      const discardResult = await db.one(
        `WITH first_card AS (
          SELECT id, card_type, card_color, card_value
          FROM "gameCards"
          WHERE game_id = $1
          AND location = 'deck'
          ORDER BY RANDOM()
          LIMIT 1
        ),
        updated_card AS (
          UPDATE "gameCards" gc
          SET location = 'discard',
              position = 1
          WHERE gc.id IN (SELECT id FROM first_card)
          RETURNING gc.id, gc.card_type, gc.card_color, gc.card_value
        )
        SELECT 
          (SELECT COUNT(*) FROM updated_card) as discard_count,
          (SELECT json_build_object(
            'id', id,
            'type', card_type,
            'color', card_color,
            'value', card_value
          ) FROM updated_card) as top_card`,
        [gameResult.id]
      );
      console.log("First card drawn to discard pile:", discardResult);

      // Update game state with card counts and initial color
      await db.none(
        `UPDATE "gameState"
         SET 
           discard_pile_count = 1,
           draw_pile_count = (
             SELECT COUNT(*) 
             FROM "gameCards" 
             WHERE game_id = $1 AND location = 'deck'
           ),
           current_color = $2,
           status = 'playing',
           last_action_time = NOW()
         WHERE game_id = $1`,
        [gameResult.id, discardResult.top_card.color]
      );

      // Verify card distribution
      const cardDistribution = await db.one(
        `SELECT 
          COUNT(*) FILTER (WHERE location = 'deck') as deck_count,
          COUNT(*) FILTER (WHERE location = 'hand') as hand_count,
          COUNT(*) FILTER (WHERE location = 'discard') as discard_count
         FROM "gameCards"
         WHERE game_id = $1`,
        [gameResult.id]
      );
      console.log("Card distribution:", cardDistribution);

      // Get all players in the room with their hands
      const playersWithHands = await db.manyOrNone(
        `SELECT 
           u.id,
           u.username,
           u.email,
           u.socket_id,
           ru.room_id,
           ru.joined_at,
           json_agg(
             json_build_object(
               'id', gc.id,
               'type', gc.card_type,
               'color', gc.card_color,
               'value', gc.card_value
             )
           ) as hand
         FROM room_users ru
         JOIN users u ON ru.user_id = u.id
         LEFT JOIN "gameCards" gc ON gc.game_id = $1 AND gc.location = 'hand' AND gc.player_id = u.id
         WHERE ru.room_id = $2
         GROUP BY u.id, u.username, u.email, u.socket_id, ru.room_id, ru.joined_at
         ORDER BY ru.joined_at ASC`,
        [gameResult.id, roomId]
      );
      console.log("Players with hands:", playersWithHands);

      // Get the top card of the discard pile
      const topCard = await db.oneOrNone(
        `SELECT 
           id,
           card_type,
           card_color as color,
           card_value as value
         FROM "gameCards"
         WHERE game_id = $1
         AND location = 'discard'
         ORDER BY position DESC
         LIMIT 1`,
        [gameResult.id]
      );
      console.log("Top card:", topCard);

      return {
        result: 'success',
        id: gameResult.id,
        players: playersWithHands,
        currentPlayer: firstPlayer.user_id,
        direction: 'clockwise',
        currentColor: topCard.color,
        topCard: topCard
      };
    } catch (error) {
      console.error("Error starting room:", error);
      return {
        result: error instanceof Error ? error.message : 'Failed to start game'
      };
    }
  },
  get_room_state: async (roomId: number) => {
    try {
      const result = await db.oneOrNone(GET_room_STATE_SQL, [roomId]);
      if (!result) {
        throw new Error(`No room state found for room ${roomId}`);
      }
      return result;
    } catch (error) {
      console.error("Error getting room state:", error);
      throw error;
    }
  },
};

export default Room;
