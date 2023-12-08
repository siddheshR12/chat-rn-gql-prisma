import { gql } from "@apollo/client";

export const MessageFields = `
  id
  sender {
    id
    username
  }
  body
  type
  fileUri
  createdAt
`;

export default {
  Queries: {
    messages: gql`
      query Messages($conversationId: String!) {
        messages(conversationId: $conversationId) {
          ${MessageFields}
        }
      }
    `,
  },
  Mutations: {
    sendMessage: gql`
      mutation SendMessage(
        $id:String!
        $conversationId: String!
        $senderId: String!
        $body: String!
        $type:String!
        $fileUri:String
      ) {
        sendMessage(
          id:$id
          conversationId: $conversationId
          senderId: $senderId
          body: $body
          type: $type
          fileUri: $fileUri
        )
      }
    `,
  },
  Subscriptions: {
    messageSent: gql`
      subscription MessageSent($conversationId: String!) {
        messageSent(conversationId: $conversationId) {
          ${MessageFields}
        }
      }
    `,
  },
};
