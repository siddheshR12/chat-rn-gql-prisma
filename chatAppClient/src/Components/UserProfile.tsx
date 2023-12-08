import * as React from 'react';
import { Text, View, StyleSheet, Image } from 'react-native';

interface UserProfileProps {
    uri:string
    userName:string
}

const UserProfile = ({uri, userName}: UserProfileProps) => {
  return (
    <View style={styles.container} >
    <Image
      source={{uri}}
      style={{width:40, height:40, borderRadius:20, marginRight:15}}
    />
    <Text style={{fontWeight:"bold"}} >{userName}</Text>
  </View>
  );
};

export default UserProfile;

const styles = StyleSheet.create({
  container: {flexDirection:"row", alignItems:"center"}
});
