import {useNavigation} from '@react-navigation/native';
import RNSecureStorage from 'rn-secure-storage';
import {NativeStackNavigationProp} from '@react-navigation/native-stack/lib/typescript/src/types';
import * as React from 'react';
import {useLayoutEffect, useEffect} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {client} from '../apollo-client';
import {DashboardStackParams} from '../navigation';
import {useUserStore} from '../Zustand/user-store';
import {useAuth0} from 'react-native-auth0';
import {useQuery, useSubscription} from '@apollo/client';
import conversations from '../graphql/conversations';
import {ConversationData} from '../utils/types/graphql';
import ConversationItem from './conversation-item';
import {resetUserStore} from '../Zustand/user-store';

interface HomeProps {}

const Home = (props: HomeProps) => {
  const {clearSession} = useAuth0();
  const loggedInUser = useUserStore(state => state.user);
  const navigation =
    useNavigation<NativeStackNavigationProp<DashboardStackParams>>();

  const {
    data: conversationData, // conversation list
    loading: conversationsLoading,
    subscribeToMore,
  } = useQuery<{conversations: Array<ConversationData>}, {userId: string}>(
    conversations.Queries.conversations,
    {
      variables: {
        userId: loggedInUser?.id as string,
      },
      skip: !loggedInUser,
      onError: error => {
        console.info(error, 'error conversation query');
      },
    },
  );

  /**
   subscribe to new converations added
   */
  const subscribeToNewConversations = () => {
    subscribeToMore({
      document: conversations.Subscriptions.conversationCreated,
      updateQuery: (
        prev,
        {
          subscriptionData,
        }: {
          subscriptionData: {
            data: {
              conversationCreated: ConversationData;
            };
          };
        },
      ) => {
        if (!subscriptionData.data) return prev;

        const newConversation = subscriptionData.data.conversationCreated;

        return Object.assign({}, prev, {
          conversations: [newConversation, ...prev.conversations],
        });
      },
    });
  };

  useSubscription<{
    conversationUpdated: {
      conversation: ConversationData;
      removedUserIds: Array<string>;
    };
  }>(conversations.Subscriptions.conversationUpdated, {
    onData: ({data}) => {
      try {
        const {data: subscriptionData} = data;

        if (!subscriptionData) return;

        const {
          conversationUpdated: {
            conversation: updatedConversation,
            removedUserIds,
          },
        } = subscriptionData;

        /**
         * Check if current user is being removed
         */
        if (removedUserIds && removedUserIds.length) {
          const isBeingRemoved = removedUserIds.find(
            id => id === loggedInUser!.id,
          );

          if (isBeingRemoved) {
            // remove the conversation from the cache
            client.writeQuery<
              {conversations: ConversationData[]},
              {userId: string}
            >({
              query: conversations.Queries.conversations,
              variables: {
                userId: loggedInUser!.id,
              },
              data: {
                conversations: conversationData!.conversations.filter(
                  c => c.id !== updatedConversation.id,
                ),
              },
            });
          }
        }
      } catch (error) {}
    },
  });

  useSubscription<{conversationDeleted: ConversationData}>(
    conversations.Subscriptions.conversationDeleted,
    {
      onData: ({client, data}) => {
        const {data: subscriptionData} = data;
        if (!loggedInUser) return;
        if (!subscriptionData) return;

        // const existing = client.readQuery<{conversations: ConversationData[]}>({
        //   query: conversations.Queries.conversations,
        // });
        const existing = conversationData;

        console.info(existing, '///exixtin convo');
        if (!existing) return;

        const {conversations: existingConversations} = existing;
        const {
          conversationDeleted: {id: deletedConversationId},
        } = subscriptionData;

        client.writeQuery<
          {conversations: ConversationData[]},
          {userId: string}
        >({
          query: conversations.Queries.conversations,
          variables: {userId: loggedInUser.id},
          data: {
            conversations: existingConversations.filter(
              conversation => conversation.id !== deletedConversationId,
            ),
          },
        });
      },
    },
  );

  //   /**
  //  * Execute subscription on mount
  //  */
  useEffect(() => {
    subscribeToNewConversations();
  }, []);

  const handleLogout = async () => {
    try {
      resetUserStore();
      await RNSecureStorage.remove('accessToken');
      await client.resetStore(); // clears apolo client cache
      await clearSession(); // clear auth0 session
    } catch (e) {
      console.log(e);
    }
  };

  // setup header navigation options for home screen
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        return (
          <View style={{flexDirection: 'row'}}>
            <TouchableOpacity
              style={{marginRight: 10}}
              onPress={() => navigation.navigate('CreateConversationModal')}>
              <Text>Converse</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <Text>Logout</Text>
            </TouchableOpacity>
          </View>
        );
      },
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.conversationContainer}>Your Conversations</Text>
      {conversationsLoading ? (
        <ActivityIndicator
          size={'large'}
          color={'#ccc'}
          style={{alignSelf: 'center'}}
        />
      ) : (
        <FlatList
          data={conversationData?.conversations}
          contentContainerStyle={{width: '100%'}}
          renderItem={({item}) => {
            const paricipantsArray = item?.participants?.filter(
              v => v.user.id !== loggedInUser?.id,
            );

            if (!loggedInUser) return null;

            return (
              <ConversationItem
                conversation={item}
                participantsArray={paricipantsArray}
                currentLoggedInUser={loggedInUser}
              />
            );
          }}
          keyExtractor={item => item.id}
        />
      )}
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  container: {},
  conversationContainer: {
    fontSize: 15,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontStyle: 'italic',
  },
});
