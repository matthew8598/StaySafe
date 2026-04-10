import mysql from "mysql2/promise";

const db = mysql.createPool({
  host: "78.98.172.32",
  port: 25566,
  user: "user",
  password: "12358Mn_-",
  database: "staysafe",
});

export default db;
