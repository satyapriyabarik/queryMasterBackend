const { v4: uuid } = require("uuid");
const { db } = require("../db");
const { sendAlert } = require("../services/alertService");
const { safeQuery, mockExpired } = require("../utils/safeQuery");
const mockInventory = require("../data/inventory");

/**
 * GraphQL resolvers for inventory management operations
 *
 * @typedef {Object} inventoryResolvers
 *
 * @property {Object} Query - GraphQL query resolvers
 * @property {Function} Query.inventory - Retrieves all inventory items sorted by creation date
 *   @returns {Promise<Array>} Array of inventory items with calculated notification countdown
 *   @description Fetches complete inventory with stock levels, expiry dates, and notifyRemainingSeconds
 *   which drives UI countdown timers
 *
 * @property {Function} Query.nearExpiry - Retrieves items expiring within specified days
 *   @param {number} days - Number of days to look ahead for expiry
 *   @returns {Promise<Array>} Array of items expiring soon with id, name, quantity, expiryDate
 *
 * @property {Function} Query.expiredItems - Retrieves items that have already expired
 *   @returns {Promise<Array>} Array of expired items with id, name, quantity, expiryDate
 *
 * @property {Function} Query.outOfStock - Retrieves items with zero quantity
 *   @returns {Promise<Array>} Array of out of stock items with id, name, quantity
 *
 * @property {Function} Query.lowStock - Retrieves items below minimum stock level
 *   @returns {Promise<Array>} Array of low stock items with current quantity and minStockLevel
 *
 * @property {Function} Query.overStocked - Retrieves items exceeding maximum stock level
 *   @returns {Promise<Array>} Array of overstocked items with current quantity and maxStockLevel
 *
 * @property {Object} Mutation - GraphQL mutation resolvers
 * @property {Function} Mutation.addItem - Creates new inventory item
 *   @param {string} name - Item name
 *   @param {string} category - Item category
 *   @param {number} quantity - Initial quantity
 *   @param {Date} expiryDate - Item expiration date
 *   @param {string} storageLocation - Where item is stored
 *   @param {number} minStockLevel - Minimum stock threshold
 *   @param {number} maxStockLevel - Maximum stock threshold
 *   @param {number} costPerUnit - Cost per unit
 *   @returns {Promise<Object>} Created item with assigned UUID
 *
 * @property {Function} Mutation.notifyItem - Sends alert for item with 2-hour cooldown enforcement
 *   @param {string} id - Item ID to notify about
 *   @param {string} type - Alert type/severity
 *   @returns {Promise<boolean>} True if notification sent successfully
 *   @throws {Error} If item not found or cooldown period not elapsed
 *   @description Updates last_notified_at timestamp and increments notify_count to prevent alert spam
 */
console.log("typeof safeQuery =", typeof safeQuery);
function normalizeMock(item) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,

    quantity: Number(item.quantity ?? 0),

    // ⭐ NEVER NULL because schema uses String!
    expiryDate:
      item.expiry_date && item.expiry_date !== ""
        ? item.expiry_date
        : "2099-12-31",

    storageLocation: item.storage_location ?? "",

    minStockLevel: Number(item.min_stock_level ?? 0),
    maxStockLevel: Number(item.max_stock_level ?? 0),

    costPerUnit: Number(item.cost_per_unit ?? 0),

    lastNotifiedAt: item.last_notified_at || null,

    notifyCount: Number(item.notify_count ?? 0),

    // countdown doesn't exist in mock → safe default
    notifyRemainingSeconds: 0,
  };
}

const inventoryResolvers = {
  Query: {
    /* =========================
       ALL INVENTORY
       ========================= */
    inventory: async () => {
      const rows = await safeQuery(`
    SELECT
      id,
      name,
      category,
      quantity,
      min_stock_level AS minStockLevel,
      DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiryDate,
      storage_location AS storageLocation,
      max_stock_level AS maxStockLevel,
      cost_per_unit AS costPerUnit,
      last_notified_at AS lastNotifiedAt,
      CASE
        WHEN last_notified_at IS NULL THEN 0
        ELSE GREATEST(
          0,
          TIMESTAMPDIFF(
            SECOND,
            NOW(),
            DATE_ADD(last_notified_at, INTERVAL 2 HOUR)
          )
        )
      END AS notifyRemainingSeconds
    FROM inventory
    ORDER BY created_at DESC
  `);

      if (!rows) return mockInventory.map(normalizeMock); // fallback to mock
      return rows;
    },

    /* =========================
       NEAR EXPIRY
       ========================= */
    nearExpiry: async (_, { days }) => {
      const rows = await safeQuery(
        `
        SELECT
          id,
          name,
          quantity,
          DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiryDate
        FROM inventory
        WHERE expiry_date > CURDATE()
          AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        `,
        [days]
      );
      if (!rows) return mockExpired.map(5);
      return rows;
    },

    /* =========================
       EXPIRED
       ========================= */
    expiredItems: async () => {
      const rows = await safeQuery(`
        SELECT
          id,
          name,
          quantity,
          DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiryDate
        FROM inventory
        WHERE expiry_date < CURDATE()
      `);
      if (!rows) return mockInventory.map(normalizeMock);

      return rows;
    },

    /* =========================
       OUT OF STOCK
       ========================= */
    outOfStock: async () => {
      const rows = await safeQuery(`
        SELECT id, name, quantity
        FROM inventory
        WHERE quantity = 0
      `);
      if (!rows) return mockInventory.map(normalizeMock);

      return rows;
    },

    /* =========================
       LOW STOCK
       ========================= */
    lowStock: async () => {
      const rows = await safeQuery(`
        SELECT
          id,
          name,
          quantity,
          min_stock_level AS minStockLevel
        FROM inventory
        WHERE quantity > 0
          AND quantity <= min_stock_level
      `);
      if (!rows) return mockInventory.map(normalizeMock);
      return rows;
    },

    /* =========================
       OVER STOCKED
       ========================= */
    overStocked: async () => {
      const rows = await safeQuery(`
        SELECT
          id,
          name,
          quantity,
          max_stock_level AS maxStockLevel
        FROM inventory
        WHERE quantity >= max_stock_level
      `);
      if (!rows) return mockInventory.map(normalizeMock);
      return rows;
    },
  },

  Mutation: {
    /* =========================
       ADD ITEM
       ========================= */
    addItem: async (_, args) => {
      const id = uuid();

      await db.execute(
        `
        INSERT INTO inventory (
          id,
          name,
          category,
          quantity,
          expiry_date,
          storage_location,
          min_stock_level,
          max_stock_level,
          cost_per_unit


        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          args.name,
          args.category,
          args.quantity,
          args.expiryDate,
          args.storageLocation,
          args.minStockLevel,
          args.maxStockLevel,
          args.costPerUnit,
        ]
      );

      return { id, ...args };
    },

    /* =========================
       NOTIFY ITEM (WITH COOLDOWN)
       ========================= */
    notifyItem: async (_, { id, type }) => {
      const [[item]] = await db.execute(
        `
    SELECT last_notified_at
    FROM inventory
    WHERE id = ?
    `,
        [id]
      );

      if (!item) throw new Error("Item not found");

      if (item.last_notified_at) {
        const diffSeconds =
          (Date.now() - new Date(item.last_notified_at).getTime()) / 1000;

        if (diffSeconds < 2 * 60 * 60) {
          const remaining = Math.ceil((2 * 60 * 60 - diffSeconds) / 60);
          throw new Error(`Try again in ${remaining} minutes`);
        }
      }

      // 🔔 send alert
      // Fetch item details to determine alert type
      const [[itemDetails]] = await db.execute(
        `
        SELECT name, quantity, min_stock_level, expiry_date
        FROM inventory
        WHERE id = ?
        `,
        [id]
      );

      let message, severity;

      // Determine alert type and message
      if (itemDetails.quantity === 0) {
        message = `${itemDetails.name} is out of stock`;
        severity = "critical";
      } else if (itemDetails.quantity <= itemDetails.min_stock_level) {
        message = `${itemDetails.name} is running low (${itemDetails.quantity} remaining)`;
        severity = "warning";
      } else if (new Date(itemDetails.expiry_date) < new Date()) {
        message = `${itemDetails.name} has expired`;
        severity = "critical";
      } else {
        const daysUntilExpiry = Math.ceil(
          (new Date(itemDetails.expiry_date) - new Date()) /
            (1000 * 60 * 60 * 24)
        );
        message = `${itemDetails.name} expires in ${daysUntilExpiry} days`;
        severity = "warning";
      }

      await sendAlert({
        subject: "Inventory Alert",
        message,
        severity,
      });

      // ✅ THIS IS CRITICAL
      await db.execute(
        `
    UPDATE inventory
    SET last_notified_at = NOW(),
        notify_count = COALESCE(notify_count, 0) + 1
    WHERE id = ?
    `,
        [id]
      );

      return true;
    },
  },
};

module.exports = { inventoryResolvers };
