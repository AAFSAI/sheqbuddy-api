import mysql from "mysql2/promise";
import { config } from "./config.js";

export function createPool() {
  return mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true
  });
}
