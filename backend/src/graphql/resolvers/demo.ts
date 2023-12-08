import { Session } from "../../types/general";
import { getUserInfo } from "../../utils/verifyToken";
import { verifyToken } from "../../utils/verifyToken";


const books = [
    {
      title: 'The Awakening',
      author: 'Kate Chopin',
    },
    {
      title: 'City of Glass',
      author: 'Paul Auster',
    },
  ];
  

// Resolvers define how to fetch the types defined in your schema.
// This resolver retrieves books from the "books" array above.
const resolvers = {
    Query: {
      books: async (_: any,
        args: any,
        context: Session) => {
          const session:any =  await verifyToken(context.token as string);
          console.log(session, "session...context");
          const user = await getUserInfo(session?.aud[1], context.token as string);
          console.log(user, "user from context");
          return books
        },
    },
  };

  export default resolvers;