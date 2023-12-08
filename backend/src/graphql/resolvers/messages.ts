import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import {
  userIsConversationParticipant,
  getCurrentAuthenticatedUser,
} from "../../utils/functions";
import {
  Session,
  MessagePopulated,
  SendMessageArguments,
  SendMessageSubscriptionPayload,
} from "../../types";
import { conversationPopulated } from "./conversations";

const resolvers = {
  Query: {
    messages: async function (
      _: any,
      args: { conversationId: string },
      context: Session
    ): Promise<Array<MessagePopulated>> {
      const { token, prisma } = context;
      const { conversationId } = args;

      const user = await getCurrentAuthenticatedUser(token as string, prisma);

      if (!user?.id) throw new GraphQLError("Invalid User");
      const userId = user?.id;

      /**
       * Verify that user is a participant
       */
      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        include: conversationPopulated,
      });

      if (!conversation) {
        throw new GraphQLError("Conversation Not Found");
      }

      const allowedToView = userIsConversationParticipant(
        conversation.participants,
        userId
      );

      if (!allowedToView) {
        throw new Error("Not Authorized");
      }

      try {
        // get messages for the conversation id
        const messages = await prisma.message.findMany({
          where: {
            conversationId,
          },
          include: messagePopulated,
          orderBy: {
            createdAt: "asc",
          },
        });

        return messages;
      } catch (error: any) {
        console.log("messages error", error);
        throw new GraphQLError(error?.message);
      }
    },
  },

  Mutation: {
    sendMessage: async function (
      _: any,
      args: SendMessageArguments,
      context: Session
    ): Promise<boolean> {
      const { token, prisma, pubsub } = context;

      const user = await getCurrentAuthenticatedUser(token as string, prisma);

      if (!user?.id) throw new GraphQLError("Invalid User");
      const userId = user?.id;

      const { id: messageId, senderId, conversationId, body, type } = args;

      let mutationData: SendMessageArguments = {
        id: messageId,
        senderId,
        conversationId,
        body,
        type,
      };
      if (type === "FILE") mutationData.fileUri = args.fileUri;
      try {
        /**
         * Create new message entity
         */
        const newMessage = await prisma.message.create({
          data: mutationData,
          include: messagePopulated,
        });

        /**
         * Could cache this in production
         */
        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            userId,
            conversationId,
          },
        });

        /**
         * Should always exist
         */
        if (!participant) {
          throw new GraphQLError("Participant does not exist");
        }

        const { id: participantId } = participant;

        /**
         * Update conversation latestMessage
         */
        const conversation = await prisma.conversation.update({
          where: {
            id: conversationId,
          },
          data: {
            latestMessageId: newMessage.id,
            participants: {
              updateMany: {
                where: {
                  id: {
                    not: participantId,
                  },
                  AND: {
                    conversationId,
                  },
                },
                data: {
                  hasSeenLatestMessage: {
                    set: false,
                  },
                },
              },
              update: {
                where: {
                  id: participantId,
                  conversationId,
                },
                data: {
                  hasSeenLatestMessage: {
                    set: true,
                  },
                },
              },
            },
          },
          include: conversationPopulated,
        });

        pubsub.publish("MESSAGE_SENT", { messageSent: newMessage }); // message send subscription event
        pubsub.publish("CONVERSATION_UPDATED", {
          //conversation updated subscription event
          conversationUpdated: {
            conversation,
          },
        });

        return true;
      } catch (error) {
        console.log("sendMessage error", error);
        throw new GraphQLError("Error sending message");
      }
    },
  },
  Subscription: {
    messageSent: {
      subscribe: withFilter(
        (_: any, __: any, context: Session) => {
          const { pubsub } = context;

          return pubsub.asyncIterator(["MESSAGE_SENT"]);
        },
        (
          payload: SendMessageSubscriptionPayload,
          args: { conversationId: string },
          context: Session
        ) => {
          return payload.messageSent.conversationId === args.conversationId;
        }
      ),
    },
  },
};

export const messagePopulated = Prisma.validator<Prisma.MessageInclude>()({
  sender: {
    select: {
      id: true,
      username: true,
    },
  },
});

export default resolvers;
