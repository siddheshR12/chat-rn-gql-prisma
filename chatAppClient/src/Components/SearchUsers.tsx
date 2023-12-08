import * as React from 'react';
import {useState} from 'react';
import {View, StyleSheet, TextInput, FlatList} from 'react-native';
import Button from './Button';
import UserProfile from './UserProfile';
import {UserData} from '../utils/types/graphql';

interface SearchUsersProps {
  searchedUsers: Array<UserData>;
  handleSearch: (searchText: string) => void;
  isSearchLoading: boolean;
  closeList: () => void;
  addUer: (item: UserData) => void;
}

const SearchUsers = ({
  searchedUsers,
  handleSearch,
  isSearchLoading,
  closeList,
  addUer,
}: SearchUsersProps) => {
  const [searchInputText, setSearchInputText] = useState('');
  return (
    <View style={styles.container}>
      <>
        <TextInput
          placeholder="search & add users"
          onChangeText={setSearchInputText}
          value={searchInputText}
          style={styles.searchInputStyles}
        />
        {searchedUsers.length > 0 && (
          <>
            <FlatList
              data={searchedUsers}
              renderItem={({item}) => (
                <View style={styles.flatlistItemStyle}>
                  <UserProfile uri={item.image} userName={item.username} />
                  <Button
                    label="Add"
                    isLoading={false}
                    handlePress={() => addUer(item)}
                  />
                </View>
              )}
              keyExtractor={item => item.id}
              style={styles.flatlistStyle}
            />
            <Button
              label="Close List"
              handlePress={closeList}
              isLoading={false}
              buttonContainerStyle={{position: 'absolute', top: 45, left: 10}}
            />
          </>
        )}
      </>

      <Button
        handlePress={() => {
          handleSearch(searchInputText);
          setSearchInputText('');
        }}
        isLoading={isSearchLoading}
        label="Search"
        buttonContainerStyle={{marginTop: 10}}
      />
    </View>
  );
};

export default SearchUsers;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    width: '95%',
    alignSelf: 'center',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchInputStyles: {
    width: '82%',
    height: 45,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'grey',
    marginTop: 10,
    paddingHorizontal: 10,
  },
  flatlistItemStyle: {
    width: '100%',
    height: 45,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
    borderBottomColor: '#f7f7f7',
    borderBottomWidth: 2,
  },
  flatlistStyle: {
    width: '95%',
    top: 70,
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 2,
    position: 'absolute',
    paddingVertical: 10,
    maxHeight: 300,
    alignSelf: 'center',
    zIndex: 1000,
  },
});
