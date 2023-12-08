import * as React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface ButtonProps {
  isLoading: boolean;
  width?: number;
  label: string;
  buttonContainerStyle?: StyleProp<ViewStyle>;
  handlePress: () => void;
}

const Button = ({
  isLoading,
  width,
  label,
  handlePress,
  buttonContainerStyle,
}: ButtonProps) => {
  return (
    <TouchableOpacity
      style={[styles.container, {width}, buttonContainerStyle]}
      disabled={isLoading}
      onPress={handlePress}>
      {isLoading ? (
        <ActivityIndicator size={'small'} color={'#fff'} />
      ) : (
        <Text style={{color: '#fff', fontWeight: 'bold'}}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: 'darkblue',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
