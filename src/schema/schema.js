const { gql } = require("apollo-server");

const typeDefs = gql`
  scalar JSON

  # =========================
  # Inventory Types
  # =========================

  type InventoryItem {
    id: ID!
    name: String!
    category: String!
    quantity: Int!
    expiryDate: String!
    storageLocation: String!
    minStockLevel: Int!
    maxStockLevel: Int!
    costPerUnit: Float!
    lastNotifiedAt: String
    notifyCount: Int
    notifyRemainingSeconds: Int
  }

  enum NotifyType {
    LOW_STOCK
    OUT_OF_STOCK
    NEAR_EXPIRY
    EXPIRED
  }

  # =========================
  # Query History
  # =========================

  type QueryHistory {
    id: ID!
    name: String
    sql_text: String!
    created_at: String!
  }

  # =========================
  # Queries
  # =========================

  type Query {
    # Inventory
    inventory: [InventoryItem!]!
    nearExpiry(days: Int!): [InventoryItem!]!
    outOfStock: [InventoryItem!]!
    lowStock: [InventoryItem!]!
    overStocked: [InventoryItem!]!
    expiredItems: [InventoryItem!]!

    # Query Builder (AST-based)
    executeQuery(rules: JSON!): JSON
    previewQuery(rules: JSON!): String
    getQueryableTables: [String!]!
    # Query History
    getSavedQueries(
      search: String
      page: Int
      limit: Int
      sortBy: String
      order: String
    ): [QueryHistory!]!
  }

  # =========================
  # Mutations
  # =========================

  type Mutation {
    # Inventory
    addItem(
      name: String!
      category: String!
      quantity: Int!
      expiryDate: String!
      storageLocation: String!
      minStockLevel: Int!
      maxStockLevel: Int!
      costPerUnit: Float!
    ): InventoryItem!

    notifyItem(id: ID!, type: NotifyType!): Boolean

    # Query Builder (AST-based)
    saveQuery(name: String): Boolean

    # RAW SQL
    executeRawQuery(sql: String!): JSON
    saveExecutedQuery(sql: String!): Boolean # ✅ ADD THIS
  }
  # ============LOT and Expiry=============

  type InventoryLot {
    id: ID!
    batchNo: String
    quantity: Int!
    expiryDate: String!
    lastNotifiedAt: String
    notifyRemainingSeconds: Int
  }

  type Product {
    id: ID!
    name: String!
    category: String!
    unit: String
    minStockLevel: Int!
    maxStockLevel: Int
    lots: [InventoryLot!]! # << key change
    totalQuantity: Int! # sum of lots
  }

  enum NotifyType {
    LOW_STOCK
    OUT_OF_STOCK
    NEAR_EXPIRY
    EXPIRED
  }

  type Query {
    products: [Product!]!
    product(id: ID!): Product
    lots(productId: ID!): [InventoryLot!]!
  }

  type Mutation {
    addProduct(
      name: String!
      category: String!
      unit: String
      minStockLevel: Int!
      maxStockLevel: Int
    ): Product!

    addLot(
      productId: ID!
      batchNo: String
      quantity: Int!
      expiryDate: String!
    ): InventoryLot!

    notifyLot(id: ID!, type: NotifyType!): Boolean
  }
`;

module.exports = { typeDefs };
