import * as React from 'react';
import {useState, useEffect} from 'react';
import {Text, View, Image} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Login from './Auth/login';
import ProfileSetup from './Auth/profile-setup';
import Home from './Dashboard/home';
import Splash from './splash';
import {useAuth0} from 'react-native-auth0';
import {useUserStore} from './Zustand/user-store';
import CreateConversationModal from './Dashboard/CreateConversationModal';
import UserProfile from './Components/UserProfile';
import ConversationRoom from './Dashboard/coversation-room';
import { ConversationData, ParticipantData } from './utils/types/graphql';

export type AuthStackParams = {
  Splash: undefined;
  Login: undefined;
};

export type DashboardStackParams = {
  Dashboard: undefined;
  ProfileSetup: undefined;
  CreateConversationModal: undefined;
  ConversationRoom:{conversation: ConversationData, participants: ParticipantData[], handleConversationRead: (conversationId: string, hasSeenLatestMessage: boolean) => Promise<void>};
};

const AuthStack = createNativeStackNavigator<AuthStackParams>();  // auth stack splash, login screens
const DashboardStack = createNativeStackNavigator<DashboardStackParams>();  // dashboard stack for after login is complete

const AuthStackNavigation = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{headerShown: false}}
      initialRouteName="Splash">
      <AuthStack.Screen name="Splash" component={Splash} />
      <AuthStack.Screen name="Login" component={Login} />
    </AuthStack.Navigator>
  );
};

const DashboardStackNavigation = () => {
  const userState = useUserStore(state => state.user);

  return (
    <DashboardStack.Navigator
      initialRouteName={'ProfileSetup'}>
      <DashboardStack.Screen
        name="Dashboard"
        component={Home}
        options={{
          headerShown: true,
          headerTitle: () => {
            if (!userState)
              return <Text style={{fontStyle: 'italic'}}>Loading....</Text>;
            return (
              <UserProfile
                uri={userState.image}
                userName={userState.username}
              />
            );
          },
        }}
      />
      <DashboardStack.Screen
        name="ProfileSetup"
        component={ProfileSetup}
        options={{headerShown: false}}
      />
      <DashboardStack.Screen
        name="ConversationRoom"
        component={ConversationRoom}
      />
      <DashboardStack.Group
        screenOptions={{
          presentation: 'modal',
          title: 'Create new conversation',
        }}>
        <DashboardStack.Screen
          name="CreateConversationModal"
          component={CreateConversationModal}
        />
      </DashboardStack.Group>
    </DashboardStack.Navigator>
  );
};

const Navigation = () => {
  const {user} = useAuth0();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

  if (isAuthenticated) return <DashboardStackNavigation />;
  return <AuthStackNavigation />;
};

export default Navigation;
