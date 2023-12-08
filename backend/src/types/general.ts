import { PrismaClient } from '@prisma/client';
import {Request, Response, } from 'express';
import { PubSub } from 'graphql-subscriptions';
import { Context } from "graphql-ws/lib/server";


export interface MyContext {
    req:Request, 
    res:Response, 
    verify: (bearerToken:string)=>Promise<unknown>
  }

export interface Session {
  token:string|null,
  prisma: PrismaClient,
  pubsub: PubSub

}

export interface SubscriptionContext extends Context {
  connectionParams: {
    session?: Session;
  };
}