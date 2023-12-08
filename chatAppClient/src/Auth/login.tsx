import * as React from 'react';
import { useAuth0 } from 'react-native-auth0';
import RNSecureStorage, { ACCESSIBLE } from 'rn-secure-storage'
import { API_AUDIENCE } from '@env';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';

interface LoginProps {}

const Login = (props: LoginProps) => {
  const {authorize} = useAuth0();

  const handleLogin = async () => {
    try {
        const cred = await authorize({audience:API_AUDIENCE, scope:'offline_access openid email profile'});
        if(cred?.accessToken) await RNSecureStorage.set("accessToken", cred?.accessToken, {accessible: ACCESSIBLE.WHEN_UNLOCKED});
    } catch (e) {
        console.log(e, "error loging in");
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={{padding:10, backgroundColor:"blue", borderRadius:5}} onPress={handleLogin} >
        <Text style={{color:"#fff", fontWeight:"bold", fontSize:18}} >Google Login</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex:1,
    justifyContent:"center",
    alignItems:"center"
  }
});
