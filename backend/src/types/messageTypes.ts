import { Prisma, $Enums } from "@prisma/client";
import { messagePopulated } from "../graphql/resolvers/messages";

/**
 * Messages
 */
export interface SendMessageArguments {
    id: string;
    conversationId: string;
    senderId: string;
    body: string;
    fileUri?: string;
    type: $Enums.MessageType
  }
  
  export interface SendMessageSubscriptionPayload {
    messageSent: MessagePopulated;
  }
  
  export type MessagePopulated = Prisma.MessageGetPayload<{
    include: typeof messagePopulated;
  }>;
  