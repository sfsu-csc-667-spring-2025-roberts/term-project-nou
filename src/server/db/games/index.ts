import db from "../connection";
import { User } from "../users";
import { 
  ADD_PLAYER, 
  CONDITIONALLY_JOIN_SQL, 
  CREATE_SQL, 
  GET_PLAYERS_SQL,
  START_GAME_SQL,
  INITIALIZE_PLAYER_HANDS_SQL,
  GET_GAME_STATE_SQL
} from "./sql";

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

const startGame = async (gameId: number) => {
  // Start a transaction to ensure all operations succeed or fail together
  return await db.tx(async (t) => {
    // Check if game has enough players
    const players = await t.manyOrNone(GET_PLAYERS_SQL, { gameId });
    const game = await t.one('SELECT min_players, max_players FROM games WHERE id = $1', [gameId]);
    
    if (players.length < game.min_players) {
      throw new Error(`Game needs at least ${game.min_players} players to start`);
    }

    // Initialize game state and get the roomID
    const { roomID } = await t.one(START_GAME_SQL, { gameId });
    
    // Deal initial cards to players
    await t.none(INITIALIZE_PLAYER_HANDS_SQL, { gameId });
    
    // Get the complete game state using the roomID we got
    const state = await t.one(GET_GAME_STATE_SQL, { gameId: roomID });
    
    return state;
  });
};

export default { create, join, getPlayers, startGame };
