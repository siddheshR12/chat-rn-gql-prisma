import * as React from 'react';
import {useLayoutEffect, useState, useEffect, useRef, useMemo} from 'react';
import {useQuery, useMutation, useSubscription} from '@apollo/client';
import {v4 as uuidv4} from 'uuid';
import {useNavigation} from '@react-navigation/native';
import {
  Text,
  View,
  StyleSheet,
  Dimensions,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {DashboardStackParams} from '../navigation';
import DocumentPicker, {
  DocumentPickerResponse,
} from 'react-native-document-picker';
import UserProfile from '../Components/UserProfile';
import {NativeStackScreenProps} from '@react-navigation/native-stack/lib/typescript/src/types';
import messages from '../graphql/messages';
import conversations from '../graphql/conversations';
import {Amplify, Storage} from 'aws-amplify';
import awsconfig from '../aws-exports';
import {useUserStore} from '../Zustand/user-store';
import {
  MessageData,
  SendMessageArguments,
  ConversationData,
} from '../utils/types/graphql';
import {uriToBlob} from '../utils/aws-uri-to-blob';
import {client} from '../apollo-client';

interface ConversationRoomProps
  extends NativeStackScreenProps<DashboardStackParams, 'ConversationRoom'> {}

const screen_height = Dimensions.get('window').height;

Amplify.configure(awsconfig);

const ConversationRoom = ({
  route: {
    params: {conversation, participants, handleConversationRead},
  },
}: ConversationRoomProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<DashboardStackParams>>();
  const loggedInUser = useUserStore(state => state.user);
  const [messageInputText, setMessageInputText] = useState('');
  const [fileObj, setFileObj] = useState<DocumentPickerResponse[] | null>(null);

  const flatlistRef = useRef<any>();

  const otherUser = useMemo(() => {
    // getting otherUser to show details in header, for chats more than 2 users, you can get the array itself, I am just sticking to getting the first user who is not logged in user
    return participants.filter(v => v.id !== loggedInUser?.id)[0];
  }, [conversation.id, loggedInUser?.id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => {
        // you can do map inside view to show multiple names for bigger chats, but i am keeping it simple and using first other user I find
        return (
          <TouchableOpacity
            style={{flexDirection: 'row', alignItems: 'center'}}
            onPress={() => navigation.goBack()}>
            <Text style={{fontWeight: 'bold', fontSize: 16}}>{`<  `}</Text>
            <UserProfile uri={otherUser.user.image} userName={''} />
            <Text style={styles.headerNameTextStyle}>
              {participants.map(
                (v, i) =>
                  `${v.user.username}${
                    i < participants.length - 1 ? ',' : ''
                  } `,
              )}
            </Text>
          </TouchableOpacity>
        );
      },
      headerTitle: '',
    });
  }, []);

  const {
    data: messagesData,
    loading,
    subscribeToMore,
  } = useQuery<{messages: MessageData[]}, {conversationId: string}>(
    messages.Queries.messages,
    {
      variables: {
        conversationId: conversation.id,
      },
    },
  );

  const [sendMessage, {loading: sendMessageLoading}] = useMutation<
    {sendMessage: boolean},
    SendMessageArguments
  >(messages.Mutations.sendMessage);

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
          conversationUpdated: {conversation: updatedConversation},
        } = subscriptionData;

        const {id: updatedConversationId} = updatedConversation;

        /**
         * Already viewing conversation where
         * new message is received; no need
         * to manually update cache due to
         * message subscription
         */
        if (updatedConversationId === conversation.id) {
          handleConversationRead(
            conversation.id,
            updatedConversation.participants.find(
              v => v.user.id === loggedInUser!.id,
            )?.hasSeenLatestMessage as boolean,
          );
        }
      } catch (error) {}
    },
  });

  const subscribeToMoreMessages = (conversationId: string) => {
    return subscribeToMore({
      document: messages.Subscriptions.messageSent,
      variables: {
        conversationId,
      },
      updateQuery: (
        prev,
        {
          subscriptionData,
        }: {subscriptionData: {data: {messageSent: MessageData}}},
      ) => {
        if (!subscriptionData.data) return prev;
        const newMessage = subscriptionData.data.messageSent;

        return Object.assign({}, prev, {
          messages:
            newMessage.sender.id === loggedInUser?.id
              ? prev.messages
              : [...prev.messages, newMessage],
        });
      },
    });
  };

  useEffect(() => {
    // subscribe message query for current open conversation
    const unsubscribe = subscribeToMoreMessages(conversation.id);

    // unsubcribe when conversation screen closed or changed
    return () => unsubscribe();
  }, [conversation.id]);

  useEffect(() => {
    // this is for adding new message to cache when user routes from home screen to chat room
    if (!messagesData) return;
    const {latestMessage, id: conversationId} = conversation;

    // check if new message already exists in message data, if not add it to cache
    const newMessageExists = messagesData?.messages.find(
      v => v.id === latestMessage?.id,
    );

    if (!newMessageExists && latestMessage) {
      client.writeQuery<{messages: MessageData[]}, {conversationId: string}>({
        query: messages.Queries.messages,
        variables: {conversationId},
        data: {
          messages: [...messagesData?.messages, latestMessage],
        },
      });
    }
  }, [conversation.latestMessage?.id]);

  const handleFileSelection = async () => {
    // Opening Document Picker to select one file
    try {
      const res = await DocumentPicker.pick({
        // Provide which type of file you want user to pick
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });

      if (res) setFileObj(res);
    } catch (err) {
      console.log(err, 'error file assoc');
    }
  };

  /**
   * handling file upload to s3 and using s3uri to call sendMessage to save uri as part of message
   */
  const uploadToS3 = async () => {
    if (!fileObj) return;

    const img = await uriToBlob(fileObj[0].uri);
    Storage.put(
      `conversationid-${conversation.id}-${Date.now()}-${fileObj[0].name}`, //s3 upload
      img,
      {
        level: 'public',
        contentType: fileObj[0].type as string,
        progressCallback(progress) {
          console.log(progress, 'progress');
        },
      },
    )
      .then(res => {
        Storage.get(res.key)
          .then(result => {
            let s3uri = result.substring(0, result.indexOf('?'));
            if (s3uri) handleSendMessage(s3uri); //send s3 uri to sendmessage
            setFileObj(null);
          })
          .catch(e => console.info(e, '...failed to fetch s3 url'));
      })
      .catch(e => console.info(e, '...error storage'));
  };

  /** *
    * send message mutation called
    * 
    * if file selected send file uri
    @param fileUri? 
  */
  const handleSendMessage = async (fileUri?: string) => {
    try {
      if (!loggedInUser) return;
      const senderId = loggedInUser.id;
      const messageId = uuidv4();
      const messageBody = messageInputText;
      if (!messageBody.trim() && !fileObj) {
        return Alert.alert('Please enter message or select file!');
      }
      const newMessage: SendMessageArguments = {
        id: messageId,
        conversationId: conversation.id,
        senderId,
        body: messageBody,
        type: 'TEXT',
      };
      if (fileUri) {
        newMessage.fileUri = fileUri;
        newMessage.type = 'FILE';
      }
      const {data, errors} = await sendMessage({
        variables: {
          ...newMessage,
        },
        /**
         * Optimistically update UI
         */
        optimisticResponse: {
          sendMessage: true, // coz send message mutation is supposed to return true on success
        },
        update: cache => {
          //update gets called after mutation is successful and provides cache
          setMessageInputText('');
          const existing = cache.readQuery<
            {messages: MessageData[]},
            {conversationId: string}
          >({
            query: messages.Queries.messages,
            variables: {conversationId: conversation.id},
          }) as {messages: MessageData[]};

          if (!existing) return;
          cache.writeQuery<{messages: MessageData[]}, {conversationId: string}>(
            {
              // this caches the new message for the user who sent the message
              query: messages.Queries.messages,
              variables: {conversationId: conversation.id},
              data: {
                messages: [
                  ...existing?.messages,
                  {
                    id: messageId,

                    body: messageBody,
                    senderId: loggedInUser.id,
                    conversationId: conversation.id,
                    sender: {
                      id: loggedInUser.id,
                      email: loggedInUser.email,
                      username: loggedInUser.username,
                      image: loggedInUser.image,
                    },
                    type: newMessage.type,
                    fileUri: newMessage.fileUri ?? null,
                    createdAt: new Date(Date.now()),
                    updatedAt: new Date(Date.now()),
                  },
                ],
              },
            },
          );
        },
      });

      if (!data?.sendMessage || errors) {
        throw new Error('Error sending message');
      }
    } catch (error: any) {
      console.log('onSendMessage error', error);
      console.info(
        error?.message,
        '...some error while sending or optimistic cache update',
      );
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatlistRef}
        data={
          messagesData?.messages ? [...messagesData.messages].reverse() : []
        }
        inverted
        scrollEnabled
        style={{width: '100%', height: screen_height * 0.8}}
        renderItem={({item}) => {
          const isLoggedInUser = item.sender.id === loggedInUser?.id;
          return (
            <View
              style={{
                width: '100%',
                alignItems: isLoggedInUser ? 'flex-end' : 'flex-start',
                padding: 10,
              }}>
              <View
                style={[
                  styles.messageNameStyle,
                  {backgroundColor: isLoggedInUser ? '#cbfa91' : '#fff'},
                ]}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: isLoggedInUser ? '#164fab' : '#73839c',
                  }}>
                  {item.sender.username}
                </Text>
              </View>

              <View
                style={{
                  padding: 5,
                  backgroundColor: isLoggedInUser ? '#cbfa91' : '#fff',
                }}>
                {item.type === 'FILE' && (
                  <Image
                    source={{uri: item.fileUri as string}}
                    style={styles.fileMessageContainerStyle}
                    resizeMode="cover"
                  />
                )}
                {item.body && <Text>{item.body}</Text>}
              </View>
            </View>
          );
        }}
        keyExtractor={item => item.id}
      />
      {sendMessageLoading && (
        <View style={styles.sendMsgLoaderStyle}>
          <ActivityIndicator
            size={'small'}
            color={'ligtblue'}
            style={{paddingRight: 10}}
          />
        </View>
      )}

      <KeyboardAvoidingView
        behavior="height"
        style={{
          width: '100%',
        }}>
        {/* if files are selected shows the selected file list before sending */}
        {fileObj && (
          <View style={styles.fileSelectContainerStyle}>
            {fileObj.map((v, i) => {
              return (
                <Image
                  key={i}
                  source={{uri: v.uri}}
                  style={styles.fileSelectImageStyle}
                  resizeMode="cover"
                />
              );
            })}
          </View>
        )}

        {/* message input and message send and file attachment button */}
        <View style={styles.msgHandlerContainerStyle}>
          <TextInput
            placeholder="type message"
            value={messageInputText}
            style={styles.msgInputStyle}
            onChangeText={text => {
              setMessageInputText(text);
            }}
          />
          <TouchableOpacity
            style={[styles.msgButtonsStyle, {marginRight: 5}]}
            onPress={() => {
              if (fileObj) {
                uploadToS3();
                // handle file s3 upload
              } else handleSendMessage();
            }}>
            <Text style={styles.msgButtonsTextStyle}>{`>>`}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleFileSelection}
            style={styles.msgButtonsStyle}>
            <Text style={styles.msgButtonsTextStyle}>File</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ConversationRoom;

const styles = StyleSheet.create({
  container: {flex: 1},
  headerNameTextStyle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginRight: 20,
    color: '#424242',
  },
  fileMessageContainerStyle: {
    width: 100,
    height: 70,
    borderWidth: 2,
    borderColor: '#8c8b8b',
    borderRadius: 5,
    marginBottom: 3,
  },
  sendMsgLoaderStyle: {
    width: '100%',
    height: 20,
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  fileSelectContainerStyle: {
    width: '100%',
    padding: 7,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
  },
  messageNameStyle: {
    padding: 2,
    borderTopRightRadius: 3,
    borderTopLeftRadius: 3,
  },
  fileSelectImageStyle: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: 'lightgray',
  },
  msgHandlerContainerStyle: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    padding: 7,
  },
  msgInputStyle: {
    flex: 3,
    height: 45,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 3,
  },
  msgButtonsStyle: {
    width: 45,
    height: 45,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'black',
  },
  msgButtonsTextStyle: {
    color: 'black',
    fontWeight: 'bold',
  },
});
