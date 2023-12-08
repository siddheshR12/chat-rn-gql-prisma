import { Prisma } from "@prisma/client";
import { withFilter } from "graphql-subscriptions";
import { GraphQLError } from "graphql";
import {
  Session,
  ConversationPopulated,
  ConversationUpdatedSubscriptionData,
  ConversationCreatedSubscriptionPayload,
  ConversationDeletedSubscriptionPayload,
} from "../../types";
import { verifyToken } from "../../utils/verifyToken";
import {
  userIsConversationParticipant,
  getCurrentAuthenticatedUser,
} from "../../utils/functions";

const resolvers = {
  Query: {
    conversations: async (
      _: any,
      args: { userId: string },
      context: Session
    ): Promise<Array<ConversationPopulated>> => {
      const { token, prisma } = context;

      await verifyToken(token as string);

      try {
        const { userId } = args;
        /**
         * Find all conversations that user is part of
         */
        const conversations = await prisma.conversation.findMany({
          where: {
            participants: {
              some: {
                userId: {
                  equals: userId,
                },
              },
            },
          },
          include: conversationPopulated,
        });

        return conversations;
      } catch (error: any) {
        console.log("error", error);
        throw new GraphQLError(error?.message);
      }
    },
  },

  Mutation: {
    createConversation: async function (
      _: any,
      args: { participantIds: Array<string> },
      context: Session
    ): Promise<{ conversationId: string }> {
      try {
        const { token, prisma, pubsub } = context;
        const { participantIds } = args;

        const user = await getCurrentAuthenticatedUser(token as string, prisma);

        if (!user?.id) throw new GraphQLError("Invalid User");
        /**
         * create new Conversation entity
         */
        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              createMany: {
                data: participantIds.map((id) => ({
                  userId: id,
                  hasSeenLatestMessage: id === user?.id,
                })),
              },
            },
          },
          include: conversationPopulated,
        });

        pubsub.publish("CONVERSATION_CREATED", {
          // send event conversation created for subscribed listeners
          conversationCreated: conversation,
        });

        return { conversationId: conversation.id };
      } catch (error) {
        console.log("createConversation error", error);
        throw new GraphQLError("Error creating conversation");
      }
    },

    markConversationAsRead: async function (
      _: any,
      args: { userId: string; conversationId: string },
      context: Session
    ): Promise<boolean> {
      const { userId, conversationId } = args;
      const { token, prisma, pubsub } = context;

      await verifyToken(token as string);

      try {
        // marking conversaiton/ new message as read
        const conversation = await prisma.conversation.update({
          where: {
            id: conversationId,
          },
          data: {
            participants: {
              updateMany: {
                where: {
                  userId,
                  conversationId,
                },
                data: {
                  hasSeenLatestMessage: true,
                },
              },
            },
          },
          include: conversationPopulated,
        });

        // pubsub.publish("CONVERSATION_UPDATED", {
        //   conversationUpdated: {
        //     conversation,
        //   },
        // });

        return true;
      } catch (error: any) {
        console.log("markConversationAsRead error", error);
        throw new GraphQLError(error.message);
      }
    },
    deleteConversation: async function (
      _: any,
      args: { conversationId: string },
      context: Session
    ): Promise<boolean> {
      const { token, prisma, pubsub } = context;
      const { conversationId } = args;

      await verifyToken(token as string);

      try {
        /**
         * Delete conversation and all related entities
         */

        /**
         * delete transaction doesnt work for me right away even though I have specified ON_DELETE cascade in schema
         * have to set latestMessage and latestMessageId to null/ undefined
         */
        await prisma.conversation.update({
          where: {
            id: conversationId,
          },
          data: {
            latestMessage: undefined,
            latestMessageId: null,
          },
        });

        const [conversationToDelete] = await prisma.$transaction([
          //transaction helps in making sure all operations are completed
          prisma.conversation.delete({
            where: {
              id: conversationId,
            },
            include: conversationPopulated,
          }),
          prisma.message.deleteMany({
            where: {
              conversationId,
            },
          }),
          prisma.conversationParticipant.deleteMany({
            where: {
              conversationId,
            },
          }),
        ]);

        pubsub.publish("CONVERSATION_DELETED", {
          conversationDeleted: conversationToDelete,
        });

        return true;
      } catch (error: any) {
        console.log("deleteConversation error", error);
        throw new GraphQLError(error?.message);
      }
    },
    updateParticipants: async function (
      _: any,
      args: { conversationId: string; participantIds: Array<string> },
      context: Session
    ): Promise<boolean> {
      const { token, prisma, pubsub } = context;
      const { conversationId, participantIds } = args;

      await verifyToken(token as string);

      try {
        // update conversation when user leaves
        const participants = await prisma.conversationParticipant.findMany({
          where: {
            conversationId,
          },
        });

        const existingParticipants = participants.map((p) => p.userId);

        // makesure the participant deleting is part of conversation
        const participantsToDelete = existingParticipants.filter((id) =>
          participantIds.includes(id)
        );

        const conversation = await prisma.conversation.update({
          where: {
            id: conversationId,
          },
          data: {
            participants: {
              deleteMany: {
                userId: {
                  in: participantsToDelete,
                },
                conversationId,
              },
            },
          },
          include: conversationPopulated,
        });

        // update subcribers to change in conversation
        pubsub.publish("CONVERSATION_UPDATED", {
          conversationUpdated: {
            conversation,
            removedUserIds: participantsToDelete,
          },
        });

        return true;
      } catch (error: any) {
        console.log("updateParticipants error", error);
        throw new GraphQLError(error?.message);
      }
    },
  },
  Subscription: {
    conversationCreated: {
      subscribe: withFilter(
        (_: any, __: any, context: Session) => {
          const { pubsub } = context;

          return pubsub.asyncIterator(["CONVERSATION_CREATED"]);
        },
        async (
          payload: ConversationCreatedSubscriptionPayload,
          _,
          context: Session
        ) => {
          try {
            const { token, prisma } = context;
            const user = await getCurrentAuthenticatedUser(
              token as string,
              prisma
            );

            if (!user?.id) throw new GraphQLError("Invalid User");

            const {
              conversationCreated: { participants },
            } = payload;

            return userIsConversationParticipant(participants, user?.id);
            // only users part of the converation are subscribed
          } catch (error) {
            throw new GraphQLError("Subscribtion error conversation created!");
          }
        }
      ),
    },
    conversationUpdated: {
      subscribe: withFilter(
        (_: any, __: any, context: Session) => {
          const { pubsub } = context;

          return pubsub.asyncIterator(["CONVERSATION_UPDATED"]);
        },
        async (
          payload: ConversationUpdatedSubscriptionData,
          _,
          context: Session
        ) => {
          try {
            const { token, prisma } = context;
            const user = await getCurrentAuthenticatedUser(
              token as string,
              prisma
            );

            if (!user?.id) throw new GraphQLError("Invalid User");
            const userId = user?.id;
            const {
              conversationUpdated: {
                conversation: { participants },
                removedUserIds,
              },
            } = payload;

            const userIsParticipant = userIsConversationParticipant(
              participants,
              userId
            );

            const userSentLatestMessage =
              payload.conversationUpdated.conversation.latestMessage
                ?.senderId === userId;

            const userIsBeingRemoved =
              removedUserIds &&
              Boolean(removedUserIds.find((id) => id === userId));

            return (
              (userIsParticipant && !userSentLatestMessage) ||
              userSentLatestMessage ||
              userIsBeingRemoved
            );

            // returns true for cases where user is participant but not seen latest msg, or user has sent latest message or when user is removed
            // only these users will be subscribed to it
          } catch (error) {
            throw new GraphQLError("Subscribtion error conversation updated!");
          }
        }
      ),
    },
    conversationDeleted: {
      subscribe: withFilter(
        (_: any, __: any, context: Session) => {
          const { pubsub } = context;

          return pubsub.asyncIterator(["CONVERSATION_DELETED"]);
        },
        async (
          payload: ConversationDeletedSubscriptionPayload,
          _,
          context: Session
        ): Promise<boolean> => {
          try {
            const { token, prisma } = context;
            const user = await getCurrentAuthenticatedUser(
              token as string,
              prisma
            );

            if (!user?.id) throw new GraphQLError("Invalid User");
            const userId = user?.id;
            const {
              conversationDeleted: { participants },
            } = payload;

            return userIsConversationParticipant(participants, userId);
          } catch (error) {
            throw new GraphQLError("Subscribtion error conversation updated!");
          }
        }
      ),
    },
  },
};

// prisma autogenerates table types once  schema.prisma is pushed
export const participantPopulated =
  Prisma.validator<Prisma.ConversationParticipantInclude>()({
    user: {
      select: {
        id: true,
        username: true,
        image: true,
      },
    },
  });

export const conversationPopulated =
  Prisma.validator<Prisma.ConversationInclude>()({
    participants: {
      include: participantPopulated,
    },
    latestMessage: {
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    },
  });

export default resolvers;
