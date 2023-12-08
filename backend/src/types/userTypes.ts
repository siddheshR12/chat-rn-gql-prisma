export interface User {
    id: string;
    name: string | null;
    email: string | null;
    emailVerified?: boolean | null;
    image: string | null;
    username: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}