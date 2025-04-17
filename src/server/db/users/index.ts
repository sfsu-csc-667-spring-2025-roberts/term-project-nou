import db from "../connection";
import bcrypt from "bcrypt";

export type User = {
  id: number;
  email: string;
  password: string;
};

const register = async (username: string, email: string, password: string) => {
  const encryptedPassword = await bcrypt.hash(password, 10);
  const { id } = await db.one(
    "INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id",
    [username, email, encryptedPassword]
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

export default { register, login };
