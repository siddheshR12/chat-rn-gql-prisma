import {ApolloClient, HttpLink, InMemoryCache, split} from '@apollo/client';
import {GraphQLWsLink} from '@apollo/client/link/subscriptions';
import {getMainDefinition} from '@apollo/client/utilities';
import {setContext} from '@apollo/client/link/context';
import {createClient} from 'graphql-ws';
import RNSecureStorage from 'rn-secure-storage';
import {IPV4_CONFIG_URL} from '@env';

// this is for websockets
const wsLink = new GraphQLWsLink(
  createClient({
    url: `http://${IPV4_CONFIG_URL}:4000/subscriptions`,
    // url: "ws://10.0.2.2:4000/subscriptions",
    connectionParams: async () => {
      // get the authentication token from secure storage if it exists
      const access_token = await RNSecureStorage.get('accessToken');
      return {session: {token: access_token}};
    },
  }),
);

// get accesstoken and auth headers for http link and session
const authLink = setContext(async (_, {headers}) => {
  try {
    // get the authentication token from secure storage if it exists
    const access_token = await RNSecureStorage.get('accessToken');
    // return the headers to the context so httpLink can read them
    return {
      headers: {
        ...headers,
        authorization: access_token,
      },
    };
  } catch (error) {
    console.info(error, 'error while setting headers in apollo client');
  }
});

const httpLink = new HttpLink({
  uri: `http://${IPV4_CONFIG_URL}:4000`,
  // uri: `http://10.0.2.2:4000`, // alternate uri works on emulator but ipv4 works on both device and emulator
  credentials: 'include',
});

// chose between websocket and http, deoending on the operation
const link = split(
  ({query}) => {
    const def = getMainDefinition(query);
    return (
      def.kind === 'OperationDefinition' && def.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink),
);

export const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});
