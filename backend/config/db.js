import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: process.env.HOST || "localhost",
  port: process.env.PORT || 25566,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});

export default db;
