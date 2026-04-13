import db from "../db.js";
import bcrypt from "bcrypt";

// Vytvoření uživatele
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
  username: "benda",
  email: "hon@test.com",
  password: "123456",
}); */

// List all users
export async function getAllUsers() {
  const [rows] = await db.execute(
    `SELECT id, username, email, created_at, updated_at FROM users`,
  );
  return rows;
}

/* console.log(await getAllUsers()); */

//List by ID
export async function getUserByID(id) {
  const [rows] = await db.execute(
    `SELECT id, username, email FROM users WHERE id = ?`,
    [id],
  );
  return rows[0];
}

// List by email - LOGIN
export async function getUserByEmail(email) {
  const [rows] = await db.execute(`SELECT * FROM users WHERE email = ?`, [
    email,
  ]);
  return rows[0];
}

// kontrola podle username
export async function getUserByUsername(username) {
  const [rows] = await db.execute(
    `SELECT * FROM users WHERE username = ? LIMIT 1`,
    [username],
  );

  return rows[0];
}

// Update user
export async function updateUser(id, username, email) {
  const [result] = await db.execute(
    `UPDATE users SET username = ?, email = ? WHERE id = ?`,
    [username, email, id],
  );
  return result.affectedRows > 0;
}

// Update Password
export async function updateUserPassword(id, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await db.execute(
    "UPDATE users SET password_hash = ? WHERE id = ?",
    [passwordHash, id],
  );

  return result.affectedRows > 0;
}

// Delete user
export async function deleteUser(id) {
  const [result] = await db.execute(`DELETE FROM users WHERE id = ?`, [id]);
  return result.affectedRows > 0;
}
