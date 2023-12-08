/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { ApolloProvider } from "@apollo/client";
import {LogBox} from 'react-native';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { Auth0Provider } from 'react-native-auth0';
import {AUTH0_DOMAIN, AUTH0_CLIENTID} from "@env";
import { client } from './apollo-client';
import Navigation from './navigation';

LogBox.ignoreAllLogs(true);

function App(): JSX.Element {
  return (
    <ApolloProvider client={client}>
      <Auth0Provider domain={AUTH0_DOMAIN} clientId={AUTH0_CLIENTID}>
        <NavigationContainer theme={DefaultTheme} >
          <Navigation/>
        </NavigationContainer>
      </Auth0Provider>
    </ApolloProvider>
  );
}

export default App;
