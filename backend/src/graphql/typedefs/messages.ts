import gql from "graphql-tag";

const typeDefs = gql`
  type Message {
    id: String
    sender: User
    body: String
    type: String
    fileUri: String
    createdAt: Date
  }

  type Query {
    messages(conversationId: String): [Message]
  }

  type Mutation {
    sendMessage(
      id:String
      conversationId: String
      senderId: String
      body: String,
      type: String,
      fileUri:String
    ): Boolean
  }

  type Subscription {
    messageSent(conversationId: String): Message
  }
`;

export default typeDefs;
