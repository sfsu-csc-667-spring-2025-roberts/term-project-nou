import db from "../connection";
import { User } from "../users";
import { ADD_PLAYER, CONDITIONALLY_JOIN_SQL, CREATE_SQL, GET_PLAYERS_SQL, LEAVE_GAME_SQL, START_GAME_SQL } from "./sql";

const create = async (
  name: string,
  minPlayers: string,
  maxPlayers: string,
  password: string,
  userId: number,
) => {
  const { id: gameId } = await db.one<{ id: number }>(CREATE_SQL, [
    name,
    minPlayers,
    maxPlayers,
    password,
  ]);

  await db.none(ADD_PLAYER, [gameId, userId]);

  return gameId;
};

const join = async (userId: number, gameId: number, password: string = "") => {
  const { playerCount } = await db.one<{ playerCount: number }>(
    CONDITIONALLY_JOIN_SQL,
    {
      gameId,
      userId,
      password,
    },
  );

  return playerCount;
};

const getPlayers = async (gameId: number) => {
  return await db.manyOrNone(GET_PLAYERS_SQL, { gameId });
};

const leave = async (userId: number, gameId: number) => {
  return await db.oneOrNone(LEAVE_GAME_SQL, { userId, gameId }); 
};

const start = async (gameId: number) => {
    return await db.one(START_GAME_SQL, [gameId]);
};

export default { create, join, getPlayers, leave, start };
