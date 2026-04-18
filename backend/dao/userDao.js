import {
  dbInsertUser,
  dbSelectAllUsers,
  dbSelectUserById,
  dbSelectUserByEmail,
  dbSelectUserByUsername,
  dbUpdateUser,
  dbUpdateUserPassword,
  dbDeleteUser,
} from "../db.js";
import bcrypt from "bcrypt";

// Vytvoření uživatele
export async function createUser(user) {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  const insertId = await dbInsertUser(user.username, user.email, hashedPassword);
  return { id: insertId, username: user.username, email: user.email };
}

// List all users
export async function getAllUsers() {
  return dbSelectAllUsers();
}

// List by ID
export async function getUserByID(id) {
  return dbSelectUserById(id);
}

// List by email - LOGIN
export async function getUserByEmail(email) {
  return dbSelectUserByEmail(email);
}

// kontrola podle username
export async function getUserByUsername(username) {
  return dbSelectUserByUsername(username);
}

// Update user
export async function updateUser(id, username, email) {
  return dbUpdateUser(id, username, email);
}

// Update Password
export async function updateUserPassword(id, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  return dbUpdateUserPassword(id, passwordHash);
}

// Delete user
export async function deleteUser(id) {
  return dbDeleteUser(id);
}
