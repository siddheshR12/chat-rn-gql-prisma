import * as React from 'react';
import {useEffect} from 'react';
import {useNavigation} from '@react-navigation/native';
import RNSecureStorage, {ACCESSIBLE} from 'rn-secure-storage';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth0} from 'react-native-auth0';
import {Text, View, StyleSheet} from 'react-native';
import {AuthStackParams} from './navigation';

interface SplashProps {}

const Splash = (props: SplashProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<AuthStackParams>>();
  const {user, getCredentials, clearSession} = useAuth0();

  useEffect(() => {
    const setCredentials = async () => {
      const cred = await getCredentials();

      // if user is signed in will save access token to storage or else redirect to login
      if (cred?.accessToken)
        await RNSecureStorage.set('accessToken', cred?.accessToken, {
          accessible: ACCESSIBLE.WHEN_UNLOCKED,
        });
      else {
        clearSession();
        navigation.navigate('Login');
      }
    };

    setCredentials();
  }, [user]);

  return (
    <View style={styles.container}>
      <Text
        style={styles.textStyle}>
        Chat App
      </Text>
    </View>
  );
};

export default Splash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textStyle: {
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
    color: 'black',
  }
});
