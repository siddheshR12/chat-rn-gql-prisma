import { gql } from "@apollo/client";
import { MessageFields } from "./messages";

const ConversationFields = `
  id
  updatedAt
  participants {
    user {
      id
      username
      image
    }
    hasSeenLatestMessage
  }
  latestMessage {
    ${MessageFields}
  }
`;

export default {
  Queries: {
    conversations: gql`
      query Conversations($userId: String!) {
        conversations(userId: $userId) {
          ${ConversationFields}
        }
      }
    `,
  },
  Mutations: {
    createConversation: gql`
      mutation CreateConversation($participantIds: [String!]!) {
        createConversation(participantIds: $participantIds) {
          conversationId
        }
      }
    `,
    markConversationAsRead: gql`
      mutation MarkConversationAsRead(
        $userId: String!
        $conversationId: String!
      ) {
        markConversationAsRead(userId: $userId, conversationId: $conversationId)
      }
    `,
    deleteConversation: gql`
      mutation deleteConversation($conversationId: String!) {
        deleteConversation(conversationId: $conversationId)
      }
    `,
    updateParticipants: gql`
      mutation UpdateParticipants(
        $conversationId: String!
        $participantIds: [String]!
      ) {
        updateParticipants(
          conversationId: $conversationId
          participantIds: $participantIds
        )
      }
    `,
  },
  Subscriptions: {
    conversationCreated: gql`
      subscription ConversationCreated {
        conversationCreated {
          ${ConversationFields}
        }
      }
    `,
    conversationUpdated: gql`
      subscription ConversationUpdated {
        conversationUpdated {
          conversation {
            ${ConversationFields}
          }
          removedUserIds
        }
      }
    `,
    conversationDeleted: gql`
      subscription ConversationDeleted {
        conversationDeleted {
          id
        }
      }
    `,
  },
};
