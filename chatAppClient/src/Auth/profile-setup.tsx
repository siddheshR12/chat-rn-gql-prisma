import {useState, useEffect} from 'react';
import {useQuery, useMutation} from '@apollo/client';
import {
  Text,
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import {DashboardStackParams} from '../navigation';
import {UserData, CreateUsernameParams} from '../utils/types/graphql';
import UserOperations from '../graphql/user';
import {setUserInStore} from '../Zustand/user-store';

interface ProfileSetupProps {}

const ProfileSetup = (props: ProfileSetupProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<DashboardStackParams>>();
  const [userName, setUserName] = useState('');

  const {data, loading, error, refetch} = useQuery<{findUser: UserData | null}>(
    UserOperations.Queries.findUser,
    {
      defaultOptions: {
        fetchPolicy: 'cache-and-network',
      },
      onError: error => {
        console.info(error, 'error find user');
      },
    },
  );

  const [createUserMutation, {data: mutationData, loading: mutationLoading}] =
    useMutation<UserData, CreateUsernameParams>(
      UserOperations.Mutations.createUsername,
      {
        onCompleted: () => {
          refetch(); // refetch find user query once a new user is created, find user completely works on session and accesstoken, no extra params needed
        },
      },
    );

  useEffect(() => {
    if (data?.findUser) {
      setUserInStore(data?.findUser);
      navigation.replace('Dashboard');
    }
  }, [data]);

  const createUser = async () => {
    if (userName.length < 3) return;
    try {
      await createUserMutation({
        variables: {username: userName},
      });
      //createuser
    } catch (error) {
      Alert.alert('User creation failed');
    }
  };

  //showing loader if fetching or even if user is found, before redirecting to dashboard
  if (loading || data?.findUser)
    return (
      <View style={styles.container}>
        <ActivityIndicator size={'large'} color={'green'} />
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={{fontSize: 19, fontWeight: 'bold'}}>Set user name</Text>
      <TextInput
        value={userName}
        placeholder="Enter Username"
        style={styles.nameInputStyle}
        onChangeText={text => setUserName(text)}
      />
      <TouchableOpacity
        style={styles.buttonStyle}
        disabled={mutationLoading}
        onPress={createUser}>
        {mutationLoading ? (
          <ActivityIndicator size={'small'} color={'#fff'} />
        ) : (
          <Text style={{fontSize: 16, fontWeight: 'bold', color: '#fff'}}>
            Done
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default ProfileSetup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameInputStyle: {
    width: '80%',
    alignSelf: 'center',
    padding: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 10,
  },
  buttonStyle: {
    padding: 10,
    backgroundColor: 'green',
    marginTop: 10,
    borderRadius: 5,
  },
});
