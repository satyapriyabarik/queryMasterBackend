const { v4: uuid } = require("uuid");
const { db } = require("../db");
const { sendAlert } = require("../services/alertService");

const COOLDOWN_SECONDS = 2 * 60 * 60; // ⏱️ 2 hours

const inventoryResolvers = {
  Query: {
    /* =========================
       ALL INVENTORY
       ========================= */
    inventory: async () => {
      const [rows] = await db.execute(`
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

      -- 🔥 THIS DRIVES THE UI
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

      return rows;
    },

    /* =========================
       NEAR EXPIRY
       ========================= */
    nearExpiry: async (_, { days }) => {
      const [rows] = await db.execute(
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

      return rows;
    },

    /* =========================
       EXPIRED
       ========================= */
    expiredItems: async () => {
      const [rows] = await db.execute(`
        SELECT
          id,
          name,
          quantity,
          DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiryDate
        FROM inventory
        WHERE expiry_date < CURDATE()
      `);

      return rows;
    },

    /* =========================
       OUT OF STOCK
       ========================= */
    outOfStock: async () => {
      const [rows] = await db.execute(`
        SELECT id, name, quantity
        FROM inventory
        WHERE quantity = 0
      `);

      return rows;
    },

    /* =========================
       LOW STOCK
       ========================= */
    lowStock: async () => {
      const [rows] = await db.execute(`
        SELECT
          id,
          name,
          quantity,
          min_stock_level AS minStockLevel
        FROM inventory
        WHERE quantity > 0
          AND quantity <= min_stock_level
      `);

      return rows;
    },

    /* =========================
       OVER STOCKED
       ========================= */
    overStocked: async () => {
      const [rows] = await db.execute(`
        SELECT
          id,
          name,
          quantity,
          max_stock_level AS maxStockLevel
        FROM inventory
        WHERE quantity >= max_stock_level
      `);

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
      await sendAlert({
        subject: "Inventory Alert",
        message: "Notification sent",
        severity: "warning",
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
