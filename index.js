require("dotenv").config();
const { ApolloServer } = require("apollo-server");
const { typeDefs } = require("./src/schema/schema");
const { resolvers } = require("./src/resolvers");
const server = new ApolloServer({ typeDefs, resolvers });

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`🚀 GraphQL Server ready at ${url}`);
});
