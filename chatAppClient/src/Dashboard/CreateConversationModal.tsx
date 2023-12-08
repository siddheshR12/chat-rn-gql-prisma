import * as React from 'react';
import {useState, useMemo} from 'react';
import { useNavigation } from '@react-navigation/native';
import {useLazyQuery, useMutation} from '@apollo/client';
import {Text, View, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import {useUserStore} from '../Zustand/user-store';
import Button from '../Components/Button';
import SearchUsers from '../Components/SearchUsers';
import user from '../graphql/user';
import {ConversationData, UserData} from '../utils/types/graphql';
import conversationsSchema from '../graphql/conversations';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DashboardStackParams } from '../navigation';
import { client } from '../apollo-client';
import conversations from '../graphql/conversations';

interface CreateConversationModalProps {}

const CreateConversationModal = (props: CreateConversationModalProps) => {
  const navigation = useNavigation<NativeStackNavigationProp<DashboardStackParams>>();
  const loggedInUser = useUserStore(state => state.user);
  const [participants, setParticipants] = useState<Array<UserData>>([]);
  const [userData, setUserData] = useState<Array<UserData>>([]);

  const [
    searchUsersQuery,
    {
      loading: searchUsersLoading,
    },
  ] = useLazyQuery<
    {searchUsers: Array<UserData> | null},
    {searchText: string; currentUserName: string}
  >(user.Queries.searchUsers);

  const updatedUsersList = useMemo(() => {
    if (userData.length > 0) {
      return userData.filter(v => !participants.includes(v));
    } else return [];
  }, [participants, userData]);

    const [createConversation, { loading: createConversationLoading }] =
    useMutation<{createConversation:{conversationId:string}}, { participantIds: Array<string> }>(
      conversations.Mutations.createConversation
    );

   /**
   * Verifies that a conversation with selected
   * participants does not already exist
   */
   const findExistingConversation = (participantIds: Array<string>) => {
    let existingConversation: ConversationData | null = null;
    const conversationsObj = client.readQuery<{conversations: Array<ConversationData>}>({query: conversationsSchema.Queries.conversations, variables:{userId: loggedInUser?.id}});
    const conversations = conversationsObj?.conversations;
    
    if(!conversations) return;
    const userId = loggedInUser?.id;
    for (const conversation of conversations) {
      // checking for each existing conversation
      // getting the participants apart from the current logged in user from each conversation
      const addedParticipants = conversation.participants.filter(
        (p) => p.user.id !== userId
      );

      // comparing existing conversation participants with the added participants for new conversation creation 

      if (addedParticipants.length !== participantIds.length) {
        continue;
      }

      let allMatchingParticipants: boolean = false;
      for (const participant of addedParticipants) {
        const foundParticipant = participantIds.find(
          (p) => p === participant.user.id
        );

        if (!foundParticipant) {
          allMatchingParticipants = false;
          break;
        }

        /**
         * If we hit here,
         * all match
         */
        allMatchingParticipants = true;
      }

      if (allMatchingParticipants) {
        existingConversation = conversation;
      }
    }

    return existingConversation;
  }

  const handleCreateConversation = () => {
    if (!loggedInUser && participants.length <= 0) return;

    const existing = findExistingConversation([...participants.map(v => v.id)]);
    
    if (existing) {
      Alert.alert("Conversation already exists!");
      return;
    }
    let allParticipantIds = [...participants.map(v => v.id), loggedInUser?.id as string];

    if(allParticipantIds.length> 1) {
      createConversation({
        variables:{
          participantIds:allParticipantIds as Array<string>
        },
        onCompleted:()=>{
          navigation.goBack();
        }
      })
    }
  };

  return (
    <View style={styles.container}>
      <SearchUsers
        searchedUsers={updatedUsersList}
        handleSearch={text => {
          if (text.length < 3) return;
          if (loggedInUser?.username)
            searchUsersQuery({
              variables: {
                currentUserName: loggedInUser.username,
                searchText: text,
              },
              onCompleted: ({searchUsers}) => {
                if (searchUsers) setUserData(searchUsers);
              },
            });
        }}
        isSearchLoading={searchUsersLoading}
        addUer={item => {
          setParticipants(p => [...p, item]);
        }}
        closeList={() => setUserData([])}
      />

      <View style={{padding: 10, flexDirection: 'row', flexWrap: 'wrap'}}>
        {participants.map(v => {
          return (
            <TouchableOpacity
              key={v.id}
              onPress={() => setParticipants(p => p.filter(l => l.id !== v.id))}
              style={styles.userSelectedContainer}>
              <Text style={{fontWeight: 'bold', fontSize: 14, marginRight: 10}}>
                {v.username}
              </Text>
              <Text
                style={{
                  color: 'red',
                  fontWeight: 'bold',
                  fontSize: 11,
                }}>{`X`}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {participants.length > 0 && (
        <Button
          handlePress={handleCreateConversation}
          isLoading={createConversationLoading}
          label="Create"
          width={100}
          buttonContainerStyle={{alignSelf: 'center'}}
        />
      )}
    </View>
  );
};

export default CreateConversationModal;

const styles = StyleSheet.create({
  container: {},
  userSelectedContainer:{
    width: 'auto',
    padding: 5,
    borderWidth: 2,
    marginRight:5,
    borderColor: 'lightblue',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  }
});
