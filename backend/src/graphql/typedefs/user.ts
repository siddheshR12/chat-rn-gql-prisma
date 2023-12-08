import gql from "graphql-tag";

const typeDefs = gql`
  scalar Date

  type User {
    id: String
    username: String
    email:String
    image:String
  }

  type Query {
    findUser: User
  }

  type Query {
    searchUsers(searchText:String!, currentUserName: String!): [User]
  }

  type Mutation {
    createUsername(username: String!): User
  }

  type CreateUsernameResponse {
    success: Boolean
    error: String
  }
`;

export default typeDefs;