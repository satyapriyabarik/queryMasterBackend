const { v4: uuid } = require("uuid");
const { db } = require("../db");
const { sendAlert } = require("../services/alertService");
const { safeQuery, mockExpired } = require("../utils/safeQuery");
const mockInventory = require("../data/inventory");
const COOLDOWN_SECONDS = Number(process.env.COOLDOWN_SECONDS) || 7200;
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
    products: async () => {
      const [products] = await db.execute(`
      SELECT *
      FROM product
    `);

      const [lots] = await db.execute(`
      SELECT *,
      GREATEST(
        0,
        TIMESTAMPDIFF(
          SECOND,
          NOW(),
          DATE_ADD(last_notified_at, INTERVAL 2 HOUR)
        )
      ) AS notifyRemainingSeconds
      FROM inventory_lot
    `);

      return products.map((p) => ({
        ...p,
        lots: lots.filter((l) => l.product_id === p.id),
        totalQuantity: lots
          .filter((l) => l.product_id === p.id)
          .reduce((a, b) => a + b.quantity, 0),
      }));
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
      SELECT 
        name,
        quantity,
        min_stock_level AS minStockLevel,
        DATE_FORMAT(expiry_date, '%Y-%m-%d') AS expiryDate,
        last_notified_at
      FROM inventory
      WHERE id = ?
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
      // await sendAlert({
      //   subject,
      //   message,
      //   severity,
      // });
      await sendAlert({
        subject,
        message,
        severity,
        meta: {
          type,
          itemName: item.name,
          quantity: item.quantity,
          minStockLevel: item.minStockLevel,
          expiryDate: item.expiryDate,
          dashboardUrl: "http://localhost:3000/" + id,
          logoUrl: "https://www.nagarro.com/hubfs/favicon-1.ico",
        },
      });

      /* ========== PERSIST COOLDOWN ========== */
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

  addLot: async (_, args) => {
    const id = uuid();

    await db.execute(
      `
    INSERT INTO inventory_lot (
      id,
      product_id,
      batch_no,
      quantity,
      expiry_date
    )
    VALUES (?, ?, ?, ?, ?)
  `,
      [id, args.productId, args.batchNo, args.quantity, args.expiryDate]
    );

    return { id, ...args };
  },
};

module.exports = { inventoryResolvers };
