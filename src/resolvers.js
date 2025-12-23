// src/resolvers.js
const GraphQLJSON = require("graphql-type-json");

// Domain resolvers
const { inventoryResolvers } = require("./resolvers/inventory.resolvers");
const { queryBuilderResolvers } = require("./resolvers/queryBuilder.resolvers");

/**
 * Apollo Server expects ONE resolver map.
 * We merge Inventory + Query Builder resolvers here.
 */
const resolvers = {
  JSON: GraphQLJSON,

  Query: {
    // Inventory queries
    ...inventoryResolvers.Query,

    // Query Builder queries
    ...queryBuilderResolvers.Query
  },

  Mutation: {
    // Inventory mutations
    ...inventoryResolvers.Mutation,

    // Query Builder mutations
    ...queryBuilderResolvers.Mutation
  }
};

module.exports = { resolvers };
