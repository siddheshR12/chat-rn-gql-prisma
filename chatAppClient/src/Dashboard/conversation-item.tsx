import * as React from 'react';
import {useMemo} from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import {gql} from '@apollo/client';
import dayjs from 'dayjs';
import {useNavigation} from '@react-navigation/native';
import {useMutation} from '@apollo/client';
import {
  ConversationData,
  ParticipantData,
  UserData,
} from '../utils/types/graphql';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {DashboardStackParams} from '../navigation';
import conversations from '../graphql/conversations';

interface ConversationItemProps {
  conversation: ConversationData;
  currentLoggedInUser: UserData;
  participantsArray: ParticipantData[];
}

const ConversationItem = ({
  conversation,
  participantsArray,
  currentLoggedInUser,
}: ConversationItemProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<DashboardStackParams>>();

  /**
   * Mutations
   */
  const [markConversationAsRead] = useMutation<
    {markConversationAsRead: true},
    {userId: string; conversationId: string}
  >(conversations.Mutations.markConversationAsRead);

  const [deleteConversation, {loading: deleting}] = useMutation<
    {conversationDeleted: true},
    {conversationId: string}
  >(conversations.Mutations.deleteConversation);

  const [removeParticipants, {loading: removingParticipant}] = useMutation<
    {conversationUpdated: true},
    {conversationId: string; participantIds: Array<string>}
  >(conversations.Mutations.updateParticipants);

  const editConversationButtons = useMemo(() => {
    let arr = [{buttonId: 'Delete', buttonName: 'Delete'}];
    if (conversation.participants.length > 2)
      arr.unshift({buttonId: 'Leave', buttonName: 'Leave'});
    return arr;
  }, [conversation.participants.length]);

  /**
   * mark conversation or message as read
   * @param conversationId
   * @param hasSeenLatestMessage
   */
  const handleConversationRead = async (
    conversationId: string,
    hasSeenLatestMessage: boolean,
  ) => {
    /**
     * Only mark as read if conversation is unread
     */
    if (hasSeenLatestMessage) return;

    try {
      const userId = currentLoggedInUser!.id;
      await markConversationAsRead({
        variables: {
          userId,
          conversationId,
        },
        optimisticResponse: {
          markConversationAsRead: true,
        },
        update: cache => {
          /**
           * Create copy to
           * allow mutation
           */
          const participants = [...conversation.participants];

          const userParticipantIdx = participants.findIndex(
            p => p.user.id === userId,
          );

          /**
           * Should always be found
           * but just in case
           */
          if (userParticipantIdx === -1) return;

          const userParticipant = participants[userParticipantIdx];

          /**
           * Update user to show latest
           * message as read
           */
          participants[userParticipantIdx] = {
            ...userParticipant,
            hasSeenLatestMessage: true,
          };

          /**
           * Update cache
           */
          cache.writeFragment({
            id: `Conversation:${conversationId}`,
            fragment: gql`
              fragment Participants on Conversation {
                participants
              }
            `,
            data: {
              participants: [...participants],
            },
          });
        },
      });
    } catch (error) {
      console.log('onViewConversation error', error);
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => {
        navigation.navigate('ConversationRoom', {
          conversation,
          participants: participantsArray,
          handleConversationRead,
        });
        handleConversationRead(
          conversation.id,
          conversation.participants.find(
            v => v.user.id === currentLoggedInUser.id,
          )?.hasSeenLatestMessage as boolean,
        );
      }}>
      <View style={{flex: 1, justifyContent: 'center'}}>
        <Image
          source={{uri: participantsArray[0]?.user?.image}}
          style={styles.profileImageStyle}
        />
      </View>
      <View style={{flex: 3, justifyContent: 'center'}}>
        <Text style={{fontWeight: 'bold', fontSize: 15}}>
          {participantsArray.map(
            (v, i) =>
              `${v.user.username}${
                i < participantsArray.length - 1 ? ',' : ''
              } `,
          )}
        </Text>
        {conversation?.latestMessage && (
          <Text style={{fontStyle: 'italic'}}>
            {conversation?.latestMessage.body
              ? conversation?.latestMessage.body
              : `@File`}
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.notifierContainerStyle}>
        {conversation.participants.map(
          v =>
            v.user.id === currentLoggedInUser!.id &&
            !v.hasSeenLatestMessage && (
              <View key={v.user.id} style={styles.notifierStyle} />
            ),
        )}
        <Text style={{fontSize: 10}}>
          {dayjs(conversation.latestMessage?.createdAt).format('DD/MM/YYYY')}
        </Text>
      </TouchableOpacity>
      <View style={{flex: 1, marginLeft: 5, justifyContent: 'center'}}>
        {deleting || removingParticipant ? (
          <ActivityIndicator size={'small'} color={'#000'} />
        ) : (
          editConversationButtons.map(v => (
            <TouchableOpacity
              key={v.buttonId}
              onPress={() => {
                if (v.buttonId === 'Leave') {
                  const participantId = conversation.participants.find(
                    v => v.user.id === currentLoggedInUser.id,
                  )!.user.id;

                  removeParticipants({
                    variables: {
                      conversationId: conversation.id,
                      participantIds: [participantId],
                    },
                  });
                } else if (v.buttonId === 'Delete')
                  deleteConversation({
                    variables: {conversationId: conversation.id},
                  });
              }}
              style={styles.editButtonStyles}>
              <Text style={{fontSize: 11, fontWeight: 'bold'}}>
                {v.buttonName}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </TouchableOpacity>
  );
};

export default ConversationItem;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 3,
    borderBottomColor: 'lightgrey',
  },
  profileImageStyle: {
    width: 40,
    height: 40,
    resizeMode: 'cover',
    borderRadius: 20,
  },
  notifierContainerStyle: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  notifierStyle: {
    width: 10,
    height: 10,
    borderRadius: 10,
    backgroundColor: 'purple',
    marginRight: 5,
  },
  editButtonStyles: {
    marginTop: 5,
    borderWidth: 2,
    backgroundColor: '#fff',
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
