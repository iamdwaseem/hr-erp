import type { UserRole } from "../constants/roles";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}
