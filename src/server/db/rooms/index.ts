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

  await db.none(
    "INSERT INTO room_users (room_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [roomId, userId]
  );
  return roomId;
};

const joinRoom = async (roomId: number, userId: number) => {
  // 首先检查用户是否已经在某个房间中
  const existingRoom = await db.oneOrNone(
    `
    SELECT r.*, ru.user_id, 
           (SELECT COUNT(*) FROM room_users WHERE room_id = r.id) as current_players
    FROM rooms r
    JOIN room_users ru ON r.id = ru.room_id
    WHERE ru.user_id = $1
    `,
    [userId]
  );

  // 如果用户已经在房间中，返回该房间信息
  if (existingRoom) {
    return {
      alreadyInRoom: true,
      roomId: existingRoom.id,
      roomInfo: existingRoom,
    };
  }

  // 如果用户不在任何房间，检查目标房间是否可以加入
  const targetRoom = await db.oneOrNone(
    `
    SELECT r.*,
           (SELECT COUNT(*) FROM room_users WHERE room_id = r.id) as current_players
    FROM rooms r
    WHERE r.id = $1
    `,
    [roomId]
  );

  // 检查房间是否存在
  if (!targetRoom) {
    throw new Error("Room does not exist");
  }

  // 检查房间是否已满
  if (targetRoom.current_players >= targetRoom.max_players) {
    throw new Error("Room is full");
  }

  // 加入房间
  await db.none("INSERT INTO room_users (room_id, user_id) VALUES ($1, $2)", [
    roomId,
    userId,
  ]);

  // 返回更新后的房间信息
  return {
    alreadyInRoom: false,
    roomId: roomId,
    roomInfo: {
      ...targetRoom,
      current_players: targetRoom.current_players + 1,
    },
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
