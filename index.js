require("dotenv").config();
const { ApolloServer } = require("apollo-server");
const { typeDefs } = require("./src/schema/schema");
const { resolvers } = require("./src/resolvers");

const server = new ApolloServer({
  typeDefs,
  resolvers,
  cors: {
    origin: ["http://localhost:3000", "http://querybuilder-frontend.s3-website.ap-south-1.amazonaws.com/"], // allow React app
    credentials: true
  }
});

server.listen({ port: 4000 }).then(({ url }) => {
  console.log(`🚀 GraphQL Server ready at ${url}`);
});