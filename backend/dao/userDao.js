import db from "../config/db.js";
import bcrypt from "bcrypt";

export async function createUser(user) {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const sql = `INSERT INTO users (username, email, password_hash) VALUES (?,?,?)`;

  const [result] = await db.execute(sql, [
    user.username,
    user.email,
    hashedPassword,
  ]);

  return {
    id: result.insertId,
    username: user.username,
    email: user.email,
  };
}

/* createUser({
  username: "matous",
  email: "matous@test.com",
  password: "123456",
}) */
