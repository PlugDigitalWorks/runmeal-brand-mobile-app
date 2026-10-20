/** Mirrors brandfe's src/types/auth.ts. */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: string;
  phoneNumber?: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken?: string;
  sid?: string;
}

export interface AuthResponse extends SessionTokens {
  user: User;
}

/** runmeal-api RegisterDto without a password: the account is confirmed with an emailed code. */
export interface RegisterInput {
  email: string;
  firstName: string;
  lastName: string;
}
