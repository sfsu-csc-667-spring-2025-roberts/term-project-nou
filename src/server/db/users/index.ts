import db from "../connection";
import bcrypt from "bcrypt";

export type User = {
    id: number;
    email: string;
    password: string;
};

const register = async (email: string, password: string) => {
    const encryptedPassword = await bcrypt.hash(password, 10);
    const {id} = await db.one("INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id", [email, encryptedPassword]);
    return id;
};

const login = async (email: string, password: string) => {
    const user = await db.one<User>("SELECT * FROM users WHERE email = $1", [email]);

    const passwordsMatch = await bcrypt.compare(password, user.password);

    if(passwordsMatch){
        return user.id;
    }else{
        throw new Error("Failed to login");
    }
};

export default {register, login};