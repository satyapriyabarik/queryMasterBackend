const { Parser } = require("node-sql-parser");
const { db } = require("../db");
const parser = new Parser();

const FORBIDDEN = [
  "INSERT",
  "UPDATE",
  "DELETE",
  "DROP",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "REPLACE",
  "MERGE",
];

async function tableExists(tableName) {
  const [rows] = await db.execute(
    `
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
    `,
    [tableName]
  );

  return rows.length > 0;
}

async function validateRawSQL(sql) {
  if (!sql || typeof sql !== "string") {
    throw new Error("SQL must be a string");
  }

  const upper = sql.toUpperCase();

  for (const word of FORBIDDEN) {
    if (upper.includes(word)) {
      throw new Error(`Forbidden keyword detected: ${word}`);
    }
  }

  let ast;
  try {
    ast = parser.astify(sql, { database: "MySQL" });
  } catch {
    throw new Error("Invalid SQL syntax");
  }

  if (Array.isArray(ast)) {
    throw new Error("Multiple SQL statements are not allowed");
  }

  if (ast.type !== "select") {
    throw new Error("Only SELECT queries are allowed");
  }

  if (!ast.from || ast.from.length === 0) {
    throw new Error("SELECT query must have a FROM clause");
  }

  // 🔥 NEW: validate each table
  for (const source of ast.from) {
    const table = source.table;

    if (!table) {
      throw new Error("Invalid table reference");
    }

    const exists = await tableExists(table);
    if (!exists) {
      throw new Error(`Table '${table}' does not exist`);
    }
  }

  return true;
}

module.exports = { validateRawSQL };
