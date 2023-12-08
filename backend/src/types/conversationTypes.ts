import { Prisma } from "@prisma/client";

import {
    conversationPopulated,
    participantPopulated,
  } from "../graphql/resolvers/conversations";

/**
 * Conversations
 */
export type ConversationPopulated = Prisma.ConversationGetPayload<{
    include: typeof conversationPopulated;
  }>;
  
  export type ParticipantPopulated = Prisma.ConversationParticipantGetPayload<{
    include: typeof participantPopulated;
  }>;
  
  export interface ConversationCreatedSubscriptionPayload {
    conversationCreated: ConversationPopulated;
  }
  
  export interface ConversationUpdatedSubscriptionData {
    conversationUpdated: {
      conversation: ConversationPopulated;
     // addedUserIds: Array<string>;
      removedUserIds: Array<string>;
    };
  }
  
  export interface ConversationDeletedSubscriptionPayload {
    conversationDeleted: ConversationPopulated;
  }
  