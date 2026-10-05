import { z } from "zod";
import { ROLES } from "../constants/roles";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerUserSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters"),
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters"),
  role: z.enum([
    ROLES.ADMIN,
    ROLES.HR,
    ROLES.MANAGER,
    ROLES.EMPLOYEE,
  ]),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
