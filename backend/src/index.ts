
// for subscriptions 
import { makeExecutableSchema } from "@graphql-tools/schema";
import { PubSub } from "graphql-subscriptions";
import { useServer } from "graphql-ws/lib/use/ws";
import { WebSocketServer } from "ws";

import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import * as dotenv from 'dotenv';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import {PrismaClient} from '@prisma/client';
import resolvers from './graphql/resolvers';
import typeDefs from './graphql/typedefs';
import { Session, SubscriptionContext } from './types/general';

const prisma = new PrismaClient()
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});
const main = async () => {
  dotenv.config();

  // Create the schema, which will be used separately by ApolloServer and
  // the WebSocket server.
 

  // Required logic for integrating with Express
  const app = express();
  // Our httpServer handles incoming requests to our Express app.
  // Below, we tell Apollo Server to "drain" this httpServer,
  // enabling our servers to shut down gracefully.
  const httpServer = http.createServer(app);  

  // Create our WebSocket server using the HTTP server we just set up.
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/subscriptions",
  });

  // Context parameters
  const pubsub = new PubSub();

  const getSubscriptionContext = async (
    ctx: SubscriptionContext
  ): Promise<Session> => {
    ctx;
    return { token: ctx.connectionParams?.session?.token??null, prisma, pubsub };
  };

  // Save the returned server's info so we can shutdown this server later
  const serverCleanup = useServer(
    {
      schema,
      context: (ctx: SubscriptionContext) => {
        // This will be run every time the client sends a subscription request
        // Returning an object will add that information to our
        // GraphQL context, which all of our resolvers have access to.
        return getSubscriptionContext(ctx);
      },
    },
    wsServer
  );
  // Set up ApolloServer.
  const server = new ApolloServer({
    schema,
    csrfPrevention: true,
    plugins: [
      // Proper shutdown for the HTTP server.
      ApolloServerPluginDrainHttpServer({ httpServer }),

      // Proper shutdown for the WebSocket server.
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });
  await server.start();

  // Set up our Express middleware to handle CORS, body parsing,
  // and our expressMiddleware function.

  app.use(
    '/',
    cors<cors.CorsRequest>(),
    bodyParser.json(),
    // expressMiddleware accepts the same arguments:
    // an Apollo Server instance and optional configuration options
    expressMiddleware(server, {
      context: async ({ req}): Promise<Session> => ({ token: req.headers.authorization as string, prisma, pubsub }),
    }),
  );

  // Modified server startup
  await new Promise<void>((resolve) => httpServer.listen({ port: process.env.PORT }, resolve));
  console.log(`🚀 Server ready at http://localhost:${process.env.PORT}/`);
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.log(e, "error with server start")
    await prisma.$disconnect()
    process.exit(1)
  })


  /* 
    - find user check -> returns userid, email username or null
    - if user null show username screen and create user -> returns same as find user
    - get other users on create conversation
    - create conversation with two or more participants
    - go to chat page, get all chat messages, open created chat
  */


