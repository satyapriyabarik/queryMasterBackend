require("dotenv").config();
const { ApolloServer } = require("apollo-server-express");
const express = require("express");
const bodyParser = require("body-parser");

const { typeDefs } = require("./src/schema/schema");
const { resolvers } = require("./src/resolvers");
async function startServer() {

  const app = express();

  // Body parser
  app.use(bodyParser.json());

  // Create Apollo Server (NO CORS here)
  const server = new ApolloServer({
    typeDefs,
    resolvers
  });

  await server.start();

  // Attach GraphQL middleware
  server.applyMiddleware({
    app,
    path: "/graphql",
    cors: { origin: 'http://localhost:3000', credentials: false }   // IMPORTANT: disable Apollo CORS
  });

  const PORT = process.env.PORT || 4000;

  app.listen(PORT, () => {
    console.log(`🚀 GraphQL Server ready at http://localhost:${PORT}${server.graphqlPath}`);
  });

}

startServer();