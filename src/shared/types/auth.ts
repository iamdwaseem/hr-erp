import type { UserRole } from "../constants/roles";

export interface SafeUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  fullName: string;
  iat?: number;
  exp?: number;
}

export interface AuthSession {
  user: SafeUser;
  token: string;
  expiresAt: number;
}

export interface LoginResponseData {
  user: SafeUser;
  token: string;
  expiresAt: number;
}
