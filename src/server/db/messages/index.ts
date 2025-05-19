import db from "../connection";
import {
  INSERT_MESSAGE_SQL,
  GET_MESSAGES_BY_ROOM_SQL,
  GET_MESSAGES_BY_GAME_SQL,
  GET_GLOBAL_MESSAGES_SQL,
} from "./sql";

interface Message {
  id?: number;
  content: string;
  type: string;
  sender_id: number;
  room_id?: number;
  game_id?: number;
  is_global: boolean;
}

async function insertMessage(message: Message) {
  const { content, type, sender_id, room_id, game_id, is_global } = message;
  return db.one(INSERT_MESSAGE_SQL, [
    content,
    type,
    sender_id,
    room_id,
    game_id,
    is_global,
  ]);
}

async function getMessagesByRoom(room_id: number) {
  return db.manyOrNone(GET_MESSAGES_BY_ROOM_SQL, [room_id]);
}

async function getMessagesByGame(game_id: number) {
  return db.manyOrNone(GET_MESSAGES_BY_GAME_SQL, [game_id]);
}

async function getGlobalMessages() {
  return db.manyOrNone(GET_GLOBAL_MESSAGES_SQL);
}

export default {
  insertMessage,
  getMessagesByRoom,
  getMessagesByGame,
  getGlobalMessages,
};
