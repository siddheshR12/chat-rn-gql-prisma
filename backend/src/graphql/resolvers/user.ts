import { GraphQLError } from "graphql";
import { Session, User } from "../../types";
import { getUserInfo, verifyToken } from "../../utils/verifyToken";  


const resolvers = {
    Query: {
      findUser: async(_:any, 
        args: any,
        context:Session) : Promise<User| null> => {
          const {prisma, token} = context; 
          try {
            const session:any =  await verifyToken(token as string);  // returns auth0 info and aud user api url which is usefull
            const userInfo = await getUserInfo(session?.aud[1], token as string);
            const userEmail = userInfo?.email;

            // check if user exist
            const user = await prisma.user.findFirst({
              where:{
                email:{
                  equals: userEmail
                }
              }
            })

            return user;

          } catch (error:any) {
            console.info(error, "error find user");
            throw new GraphQLError(error?.message);
          }
        },

      searchUsers: async (_: any,
        args: {searchText: string, currentUserName:string},
        context: Session) : Promise<Array<User>> => {
          const {prisma, token} = context; 
          try {
            const session:any =  await verifyToken(token as string);  
            // const user = await getUserInfo(session?.aud[1], token as string);

            // search users based on text and exclude current loggedin user, used while creating new conversation
            const users = await prisma.user.findMany({
              where: {
                username: {
                  contains: args.searchText,
                  not: args.currentUserName,
                },
              },
            });

            return users
          } catch (error: any) {
            throw new GraphQLError(error?.message);
          }
        },
    },
    Mutation: {
      createUsername: async function createUsername(
        _: any,
        args: { username: string },
        context: Session
      ): Promise<User> {
        const { token, prisma } = context;
  
        try {
          const session:any =  await verifyToken(token as string);
          const userInfo = await getUserInfo(session?.aud[1], token as string);

          if(!userInfo?.email || !args?.username) throw new GraphQLError("Invalid user");

          // create user in our user table after signin successfull, called on profile setup page
          const user = prisma.user.create({
            data:{
              email:userInfo?.email,
              image:userInfo?.picture,
              username: args.username,
              name: userInfo?.name,
              emailVerified: userInfo?.email_verified
            }
          })

          return user;
          
        } catch (error:any) {
          throw new GraphQLError(error?.message);
        }
      },
    }
  };

  export default resolvers;