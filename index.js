// require("dotenv").config();
// const { ApolloServer } = require("apollo-server");
// const { typeDefs } = require("./src/schema/schema");
// const { resolvers } = require("./src/resolvers");

// const server = new ApolloServer({
//   typeDefs,
//   resolvers,
//   cors: {
//     origin: ["http://localhost:3000", "http://querybuilder-frontend.s3-website.ap-south-1.amazonaws.com"], // allow React app
//     credentials: true
//   }
// });

// server.listen({ port: 4000 }).then(({ url }) => {
//   console.log(`🚀 GraphQL Server ready at ${url}`);
// });
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ApolloServer } = require("apollo-server-express");

const { typeDefs } = require("./src/schema/schema");
const { resolvers } = require("./src/resolvers");

async function startServer() {

  const app = express();

  app.use(cors({
    origin: [
      "http://localhost:3000",
      "http://querybuilder-frontend.s3-website.ap-south-1.amazonaws.com"
    ],
    credentials: true
  }));

  const server = new ApolloServer({
    typeDefs,
    resolvers
  });

  await server.start();

  server.applyMiddleware({
    app,
    path: "/graphql",
    cors: false
  });

  app.listen(4000, () => {
    console.log("🚀 GraphQL Server ready at http://localhost:4000/graphql");
  });
}

startServer();