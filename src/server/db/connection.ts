import "dotenv/config";
import pgp from "pg-promise";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const connection = pgp()(process.env.DATABASE_URL);

export default connection;
