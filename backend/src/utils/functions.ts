import { PrismaClient, User } from "@prisma/client";
import { ParticipantPopulated } from "../types/conversationTypes";
import { verifyToken, getUserInfo } from "./verifyToken";

export const userIsConversationParticipant = (
    participants: Array<ParticipantPopulated>,
    userId: string
  ): boolean => {
    return !!participants.find((participant) => participant.userId === userId);
  }

export const getCurrentAuthenticatedUser = async (token:string, prisma: PrismaClient): Promise<User|null> => {
    await verifyToken(token as string);
    const session:any =  await verifyToken(token as string);
    const userInfo = await getUserInfo(session?.aud[1], token as string);
    const userEmail = userInfo?.email;

    const user = await prisma.user.findFirst({
            where:{
                email:{
                equals: userEmail
                }
            }
    });

    return user;
}