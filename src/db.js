const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
  host: process.env.DB_HOST,       // Cloud SQL Public IP
  user: process.env.DB_USER,       // qb_user
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
  connectTimeout: 20000,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = { db };
