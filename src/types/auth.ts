/** Mirrors brandfe's src/types/auth.ts. */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  role: string;
  phoneNumber?: string;
  /** A guest checkout session the API made without sign-up; the app never creates one. */
  isGuest?: boolean;
}

/** runmeal-api's customer role; staff and managers sign in to the dashboard, not here. */
export const CUSTOMER_ROLE = 'customer';

/** Only a real customer account can delete itself from the app. */
export const canDeleteAccount = (user: User | null): user is User =>
  !!user && !user.isGuest && user.role?.toLowerCase() === CUSTOMER_ROLE;

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
