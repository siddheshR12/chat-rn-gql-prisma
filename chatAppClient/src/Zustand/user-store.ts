import { create } from 'zustand'
import { UserData } from '../utils/types/graphql';

interface UserState {
    user: UserData|null
}


export const useUserStore = create<UserState>(() => ({
    user:null
  }))

export const setUserInStore = (user:UserData) =>
  useUserStore.setState(() => ({ user}));

export const resetUserStore = () => useUserStore.setState(()=>({user:null}))  
