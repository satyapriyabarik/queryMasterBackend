const { db } = require("./db");

async function testConnection() {
  console.log("DB_HOST:", process.env.DB_HOST);
  console.log("DB_USER:", process.env.DB_USER);
  console.log("DB_NAME:", process.env.DB_NAME);

  try {
    const [rows] = await db.execute("SELECT DATABASE() AS db");
    console.log("✅ Connected to DB:", rows);
  } catch (error) {
    console.error("❌ FULL ERROR:", error);
  } finally {
    process.exit(0);
  }
}

testConnection();
