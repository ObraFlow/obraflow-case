import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      roles: string[];
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    roles: string[];
    accessToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    roles?: string[];
    accessToken?: string;
  }
}
