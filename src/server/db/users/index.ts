import db from "../connection";
import bcrypt from "bcrypt";
import { UPDATE_SOCKET_ID_SQL } from "./sql";

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  socket_id?: string;
}

const register = async (
  username: string,
  email: string,
  password: string
): Promise<number> => {
  const hash = await bcrypt.hash(password, 10);

  const { id } = await db.one<{ id: number }>(
    "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id",
    [username, email, hash]
  );

  return id;
};

const login = async (email: string, password: string) => {
  const user = await db.one<User>("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  const passwordsMatch = await bcrypt.compare(password, user.password);

  if (passwordsMatch) {
    return user.id;
  } else {
    throw new Error("Failed to login");
  }
};

const getById = async (id: number): Promise<Omit<User, "password">> => {
  return await db.one<Omit<User, "password">>(
    "SELECT id, username, email FROM users WHERE id=$1",
    [id]
  );
};

const updateSocketId = async (userId: number, socketId: string | null) => {
  return await db.oneOrNone(UPDATE_SOCKET_ID_SQL, [socketId, userId]);
};

export default {
  register,
  login,
  getById,
  updateSocketId,
};
