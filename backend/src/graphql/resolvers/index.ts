import merge from "lodash.merge";
import sampleResolver from './demo';
import conversationResolvers from "./conversations";
import messageResolvers from "./messages";
import userResolvers from "./user";
import scalarResolvers from "./scalars";

const resolvers = merge(
  {},
  userResolvers,
  conversationResolvers,
  messageResolvers,
  scalarResolvers,
);

export default resolvers;