// const { v4: uuid } = require("uuid");
// const { db } = require("../db");
// const { sendAlert } = require("../services/alertService");

// const COOLDOWN_SECONDS = 2 * 60 * 60; // ⏱️ 2 hours

// const inventoryResolvers = {
//   Query: {
//     /* =========================
//        ALL INVENTORY
//        ========================= */
//     inventory: async () => {
//       const [rows] = await db.execute(`
//     SELECT
//       id,
//       name,
//       category,
//       quantity,
//       min_stock_level AS minStockLevel,
//       DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiryDate,
//       storage_location AS storageLocation,
//       max_stock_level AS maxStockLevel,
//       cost_per_unit AS costPerUnit,
//       last_notified_at AS lastNotifiedAt,

//       -- 🔥 THIS DRIVES THE UI
//       CASE
//         WHEN last_notified_at IS NULL THEN 0
//         ELSE GREATEST(
//           0,
//           TIMESTAMPDIFF(
//             SECOND,
//             NOW(),
//             DATE_ADD(last_notified_at, INTERVAL 2 HOUR)
//           )
//         )
//       END AS notifyRemainingSeconds

//     FROM inventory
//     ORDER BY created_at DESC
//   `);

//       return rows;
//     },

//     /* =========================
//        NEAR EXPIRY
//        ========================= */
//     nearExpiry: async (_, { days }) => {
//       const [rows] = await db.execute(
//         `
//         SELECT
//           id,
//           name,
//           quantity,
//           DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiryDate
//         FROM inventory
//         WHERE expiry_date > CURDATE()
//           AND expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
//         `,
//         [days]
//       );

//       return rows;
//     },

//     /* =========================
//        EXPIRED
//        ========================= */
//     expiredItems: async () => {
//       const [rows] = await db.execute(`
//         SELECT
//           id,
//           name,
//           quantity,
//           DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiryDate
//         FROM inventory
//         WHERE expiry_date < CURDATE()
//       `);

//       return rows;
//     },

//     /* =========================
//        OUT OF STOCK
//        ========================= */
//     outOfStock: async () => {
//       const [rows] = await db.execute(`
//         SELECT id, name, quantity
//         FROM inventory
//         WHERE quantity = 0
//       `);

//       return rows;
//     },

//     /* =========================
//        LOW STOCK
//        ========================= */
//     lowStock: async () => {
//       const [rows] = await db.execute(`
//         SELECT
//           id,
//           name,
//           quantity,
//           min_stock_level AS minStockLevel
//         FROM inventory
//         WHERE quantity > 0
//           AND quantity <= min_stock_level
//       `);

//       return rows;
//     },

//     /* =========================
//        OVER STOCKED
//        ========================= */
//     overStocked: async () => {
//       const [rows] = await db.execute(`
//         SELECT
//           id,
//           name,
//           quantity,
//           max_stock_level AS maxStockLevel
//         FROM inventory
//         WHERE quantity >= max_stock_level
//       `);

//       return rows;
//     },
//   },

//   Mutation: {
//     /* =========================
//        ADD ITEM
//        ========================= */
//     addItem: async (_, args) => {
//       const id = uuid();

//       await db.execute(
//         `
//         INSERT INTO inventory (
//           id,
//           name,
//           category,
//           quantity,
//           expiry_date,
//           storage_location,
//           min_stock_level,
//           max_stock_level,
//           cost_per_unit
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `,
//         [
//           id,
//           args.name,
//           args.category,
//           args.quantity,
//           args.expiryDate,
//           args.storageLocation,
//           args.minStockLevel,
//           args.maxStockLevel,
//           args.costPerUnit,
//         ]
//       );

//       return { id, ...args };
//     },
//     /* =========================
//        NOTIFY ITEM (WITH COOLDOWN + NAMED ALERT)
//        ========================= */
//     notifyItem: async (_, { id, type }) => {
//       const [[item]] = await db.execute(
//         `
//     SELECT 
//       id,
//       name,
//       quantity,
//       DATE_FORMAT(expiry_date,'%Y-%m-%d') AS expiryDate,
//       min_stock_level AS minStockLevel,
//       last_notified_at
//     FROM inventory
//     WHERE id = ?
//     `,
//         [id]
//       );

//       if (!item) throw new Error("Item not found");

//       /* ===== COOLDOWN ENFORCEMENT ===== */
//       if (item.last_notified_at) {
//         const diffSeconds =
//           (Date.now() - new Date(item.last_notified_at).getTime()) / 1000;

//         if (diffSeconds < COOLDOWN_SECONDS) {
//           const remainingMinutes = Math.ceil(
//             (COOLDOWN_SECONDS - diffSeconds) / 60
//           );

//           throw new Error(
//             `Notification already sent for "${item.name}". Try again in ${remainingMinutes} minutes.`
//           );
//         }
//       }

//       /* ===== CUSTOM SUBJECT & MESSAGE ===== */

//       const subject = `Inventory Alert: ${item.name}`;

//       let message = "";

//       switch (type) {
//         case "LOW_STOCK":
//           message = `⚠️ ${item.name} is LOW on stock.
// Current qty: ${item.quantity}
// Minimum level: ${item.minStockLevel}`;
//           break;

//         case "OUT_OF_STOCK":
//           message = `⛔ ${item.name} is OUT OF STOCK.`;
//           break;

//         case "NEAR_EXPIRY":
//           message = `⏳ ${item.name} is NEAR EXPIRY.
// Expiry Date: ${item.expiryDate}`;
//           break;

//         case "EXPIRED":
//           message = `❌ ${item.name} has EXPIRED.
// Expiry Date: ${item.expiryDate}`;
//           break;

//         default:
//           message = `📢 Notification for ${item.name}`;
//       }

//       /* ===== SEND ALERT ===== */
//       await sendAlert({
//         subject,
//         message,
//         severity: "warning"
//       });

//       /* ===== PERSIST COOLDOWN ===== */
//       await db.execute(
//         `
//     UPDATE inventory
//     SET 
//       last_notified_at = NOW(),
//       notify_count = COALESCE(notify_count, 0) + 1
//     WHERE id = ?
//     `,
//         [id]
//       );

//       return true;
//     }

//   },
// };

// module.exports = { inventoryResolvers };
const { v4: uuid } = require("uuid");
const { db } = require("../db");
const { sendAlert } = require("../services/alertService");
const { safeQuery, mockExpired } = require("../utils/safeQuery");
const mockInventory = require("../data/inventory");

const COOLDOWN_SECONDS = 2 * 60 * 60; // 2 hours
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
    inventory: async () => {
      const [rows] = await db.execute(`
      SELECT
        il.id,
        p.name,
        p.category,
        il.quantity,
        DATE_FORMAT(il.expiry_date, '%Y-%m-%d') AS expiryDate,
        il.storage_location AS storageLocation,
        p.min_stock_level AS minStockLevel,
        p.max_stock_level AS maxStockLevel,
        p.cost_per_unit AS costPerUnit,
        il.last_notified_at AS lastNotifiedAt,
        il.notify_count AS notifyCount,
        CASE
          WHEN il.last_notified_at IS NULL THEN 0
          ELSE GREATEST(
            0,
            TIMESTAMPDIFF(
              SECOND,
              NOW(),
              DATE_ADD(il.last_notified_at, INTERVAL 2 HOUR)
            )
          )
        END AS notifyRemainingSeconds
      FROM inventory_lot il
      JOIN product p ON il.product_id = p.id
      ORDER BY il.expiry_date ASC
    `);

      return rows;
    },
    //     /* =========================
    //        OUT OF STOCK
    //        ========================= */
    outOfStock: async () => {
      const [rows] = await db.execute(`
        SELECT il.id, p.name, il.quantity
        FROM inventory_lot il
        JOIN product p ON il.product_id = p.id
        WHERE il.quantity = 0
      `);

      return rows;
    },
    //     /* =========================
    //        LOW STOCK
    //        ========================= */
    lowStock: async () => {
      const [rows] = await db.execute(`
        SELECT
          il.id,
          p.name,
          il.quantity,
          p.min_stock_level AS minStockLevel
        FROM inventory_lot il
        JOIN product p ON il.product_id = p.id
        WHERE il.quantity > 0
          AND il.quantity <= p.min_stock_level
      `);

      if (!rows) return mockInventory.map(normalizeMock); // fallback to mock
      return rows;
    },

    //     /* =========================
    //        OVER STOCKED
    //        ========================= */
    overStocked: async () => {
      const [rows] = await db.execute(`
       SELECT
          il.id,
          p.name,
          il.quantity,
          p.max_stock_level AS maxStockLevel
        FROM inventory_lot il
        JOIN product p ON il.product_id = p.id
        WHERE il.quantity >= p.max_stock_level
      `);

      return rows;
    },
    //     /* =========================
    //        EXPIRED
    //        ========================= */
    expiredItems: async () => {
      const [rows] = await db.execute(`
        SELECT
          il.id,
          p.name,
          il.quantity,
          p.max_stock_level AS maxStockLevel,
          DATE_FORMAT(il.expiry_date, '%Y-%m-%d') AS expiryDate 
        FROM inventory_lot il
        JOIN product p ON il.product_id = p.id
        WHERE il.expiry_date < CURDATE()
      `);

      return rows;
    },

    //     /* =========================
    //        NEAR EXPIRY
    //        ========================= */
    nearExpiry: async (_, { days }) => {
      const rows = await safeQuery(
        `
        SELECT
          il.id,
          p.name,
          il.quantity,
          DATE_FORMAT(il.expiry_date, '%Y-%m-%d') AS expiryDate
        FROM inventory_lot il
        JOIN product p ON il.product_id = p.id
        WHERE il.expiry_date > CURDATE()
          AND il.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
        `,
        [days]
      );
      if (!rows) return mockExpired.map(5);
      return rows;
    },

  },
  Mutation: {
    addItem: async (_, args) => {
      const productId = uuid();
      const lotId = uuid();

      // Insert product
      await db.execute(
        `
        INSERT INTO product (
          id, name, category, unit,
          min_stock_level, max_stock_level, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `,
        [
          productId,
          args.name,
          args.category,
          args.unit || "Unit",
          args.minStockLevel,
          args.maxStockLevel,
        ]
      );

      // Insert inventory lot
      await db.execute(
        `
        INSERT INTO inventory_lot (
          id, product_id, batch_no, quantity,
          expiry_date, storage_location, cost_per_unit,
          last_notified_at, notify_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0)
        `,
        [
          lotId,
          productId,
          args.batchNo || "BATCH-" + Date.now(),
          args.quantity,
          args.expiryDate,
          args.storageLocation,
          args.costPerUnit,
        ]
      );

      return { id: lotId, ...args };
    },

    notifyItem: async (_, { id, type }) => {
      const [[item]] = await db.execute(
        `
        SELECT 
          il.id,
          p.name,
          il.quantity,
          DATE_FORMAT(il.expiry_date,'%Y-%m-%d') AS expiryDate,
          p.min_stock_level AS minStockLevel,
          il.last_notified_at
        FROM inventory_lot il
        JOIN product p ON il.product_id = p.id
        WHERE il.id = ?
        `,
        [id]
      );

      if (!item) throw new Error("Item not found");

      /* ========== COOLDOWN CHECK ========== */
      if (item.last_notified_at) {
        const diffSeconds =
          (Date.now() - new Date(item.last_notified_at).getTime()) / 1000;

        if (diffSeconds < COOLDOWN_SECONDS) {
          const remaining = Math.ceil((COOLDOWN_SECONDS - diffSeconds) / 60);
          throw new Error(`Try again in ${remaining} minutes`);
        }
      }

      /* ========== SUBJECT & MESSAGE BUILDER ========== */

      let subject = "";
      let message = "";
      let severity = "info";

      switch (type) {
        case "EXPIRED":
          subject = "❌ EXPIRED ITEM ALERT";
          message = `Item: ${item.name}
Expiry Date: ${item.expiryDate}
This item is already expired. Immediate action required.`;
          severity = "critical";
          break;

        case "NEAR_EXPIRY":
          subject = "⏰ NEAR EXPIRY ALERT";
          message = `Item: ${item.name}
Expiry Date: ${item.expiryDate}
This item will expire soon. Please prioritize usage.`;
          severity = "warning";
          break;

        case "OUT_OF_STOCK":
          subject = "🚨 OUT OF STOCK ALERT";
          message = `Item: ${item.name}
The item is OUT OF STOCK.
Immediate restock required.`;
          severity = "critical";
          break;

        case "LOW_STOCK":
          subject = "⚠️ LOW STOCK ALERT";
          message = `Item: ${item.name}
Quantity Remaining: ${item.quantity}
Minimum Stock Level: ${item.minStockLevel}
Consider replenishing soon.`;
          severity = "warning";
          break;

        default:
          throw new Error("Invalid notification type");
      }

      /* ========== SEND ALERT ========== */
      await sendAlert({
        subject,
        message,
        severity,
      });

      /* ========== PERSIST COOLDOWN ========== */
      await db.execute(
        `
      UPDATE inventory_lot
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
