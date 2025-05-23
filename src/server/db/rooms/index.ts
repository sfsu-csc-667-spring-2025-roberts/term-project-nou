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
  return await db.one(START_room_SQL, [roomId]);
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

export default {
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
};
