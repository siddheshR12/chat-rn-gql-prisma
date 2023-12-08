export interface UserData {
  id: string;
  email: string;
  username: string;
  image: string;
}

export interface SearchUsersParams {
  searchText: string;
  currentUserName: string;
}

export interface CreateUsernameParams {
  username: string;
}

//conversations

export interface ConversationData {
  id: string;
  participants: Array<ParticipantData>;
  messages?: Array<MessageData>;
  latestMessage?: MessageData;
  latestMessageId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ParticipantData {
  id: string;
  user: UserData;
  userId: string;
  conversation: ConversationData;
  conversationId: string;
  hasSeenLatestMessage?: boolean;
}

export interface MessageData {
  id: string;
  conversation?: ConversationData;
  conversationId: string;
  isLatestIn?: boolean;
  sender: UserData;
  senderId: string;
  body: string;
  type: MessageType;
  fileUri: string|null;
  createdAt?: Date;
  updatedAt?: Date;
}

export const MessageType: {[x: string]: 'TEXT' | 'FILE'} = {
  TEXT: 'TEXT',
  FILE: 'FILE',
};

export interface SendMessageArguments {
  id:string;
  conversationId: string;
  senderId: string;
  body: string;
  type:MessageType;
  fileUri?:string;
}

export type MessageType = (typeof MessageType)[keyof typeof MessageType];
