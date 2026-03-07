const { db } = require("../db");
const { validateRawSQL } = require("../utils/sqlValidator");
const { v4: uuid } = require("uuid");
/* ======================================================
   QUERY BUILDER RESOLVERS
   ====================================================== */

const queryBuilderResolvers = {
  Query: {
    /* =========================
       QUERY HISTORY (GRID)
       ========================= */
    getSavedQueries: async (
      _,
      {
        search = "",
        page = 1,
        limit = 10,
        sortBy = "created_at",
        order = "DESC",
      }
    ) => {
      try {
        const safeLimit = Math.max(1, Math.min(Number(limit), 100));
        const safePage = Math.max(1, Number(page));
        const offset = (safePage - 1) * safeLimit;

        const allowedSort = ["created_at", "name"];
        const safeSortBy = allowedSort.includes(sortBy) ? sortBy : "created_at";

        const safeOrder = order === "ASC" ? "ASC" : "DESC";
        const searchTerm = `%${search || ""}%`;

        const sql = `
          SELECT
            id,
            name,
            sql_text,
            created_at
          FROM query_history
          WHERE name LIKE ?
             OR sql_text LIKE ?
          ORDER BY ${safeSortBy} ${safeOrder}
          LIMIT ${safeLimit}
          OFFSET ${offset}
        `;

        const [rows] = await db.execute(sql, [searchTerm, searchTerm]);

        return rows ?? [];
      } catch (err) {
        console.error("getSavedQueries error:", err);
        return [];
      }
    },

    /* =========================
       TABLE METADATA
       ========================= */
    getQueryableTables: async () => {
      const [rows] = await db.execute(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
      `);

      return rows.map((r) => r.TABLE_NAME);
    },
  },

  Mutation: {
    /* =========================
       EXECUTE RAW SQL
       ========================= */
    executeRawQuery: async (_, { sql }) => {
      try {
        await validateRawSQL(sql);

        const [rows] = await db.execute(sql);

        return rows;
      } catch (err) {
        throw new Error(err.message);
      }
    },

    /* =========================
       SAVE EXECUTED RAW QUERY
       ========================= */
    saveExecutedQuery: async (_, { sql }) => {
      try {
        await validateRawSQL(sql);

        // 🔹 Prevent duplicates (optional but recommended)
        const [[existing]] = await db.execute(
          `
          SELECT id
          FROM query_history
          WHERE sql_text = ?
          LIMIT 1
          `,
          [sql]
        );

        if (existing) {
          return true; // already saved, silently succeed
        }

        // 🔹 Auto-generate name
        const [[{ count }]] = await db.execute(
          `SELECT COUNT(*) AS count FROM query_history`
        );

        const name = `Query ${count + 1}`;
        const id = uuid();
        await db.execute(
          `
          INSERT INTO query_history (id, name, sql_text)
          VALUES (?, ?, ?)
          `,
          [id, name, sql]
        );            

        return true;
      } catch (err) {
        throw new Error(err.message);
      }
    },
  },
};

module.exports = { queryBuilderResolvers };
