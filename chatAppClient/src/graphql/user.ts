import { gql } from "@apollo/client";

const userData = `
    id
    username
    email
    image
`;

export default {
  Queries: {
    searchUsers: gql`
      query SearchUsers($searchText: String!, $currentUserName: String!) {
        searchUsers(searchText: $searchText, currentUserName: $currentUserName) {
            ${userData}
        }
      }
    `,
    findUser: gql`
      query FindUser {
        findUser {
            ${userData}
        }
      }
    `,
  },
  Mutations: {
    createUsername: gql`
      mutation CreateUsername($username: String!) {
        createUsername(username: $username) {
            ${userData}
        }
      }
    `,
  }
};
