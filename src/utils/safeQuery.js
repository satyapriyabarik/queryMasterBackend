const { db } = require("../db");

// Safe DB wrapper
async function safeQuery(sql, params = []) {
  try {
    const [rows] = await db.execute(sql, params);
    return rows; // always return ARRAY
  } catch (err) {
    console.error("DB ERROR in safeQuery:", err.message);
    return null; // trigger fallback
  }
}

const dayDiff = (date) => {
  const d = new Date(date);
  const today = new Date();
  return Math.ceil((d - today) / (1000 * 60 * 60 * 24));
};

function mockNearExpiry(days) {
  return mockInventory
    .map(normalizeMock)
    .filter(
      (item) => dayDiff(item.expiryDate) > 0 && dayDiff(item.expiryDate) <= days
    );
}

function mockExpired() {
  return mockInventory
    .map(normalizeMock)
    .filter((item) => new Date(item.expiryDate) < new Date());
}

function mockOutOfStock() {
  return mockInventory.map(normalizeMock).filter((item) => item.quantity === 0);
}

function mockLowStock() {
  return mockInventory
    .map(normalizeMock)
    .filter((item) => item.quantity > 0 && item.quantity <= item.minStockLevel);
}

function mockOverStock() {
  return mockInventory
    .map(normalizeMock)
    .filter((item) => item.quantity >= item.maxStockLevel);
}

module.exports = {
  safeQuery,
  mockNearExpiry,
  mockExpired,
  mockOutOfStock,
  mockLowStock,
  mockOverStock,
};
