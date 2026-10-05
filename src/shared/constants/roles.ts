export const ROLES = {
  ADMIN: "ADMIN",
  HR: "HR",
  MANAGER: "MANAGER",
  EMPLOYEE: "EMPLOYEE",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  EMPLOYEE_READ: "employee:read",
  EMPLOYEE_CREATE: "employee:create",
  EMPLOYEE_UPDATE: "employee:update",
  EMPLOYEE_DELETE: "employee:delete",
  EMPLOYEE_SELF_READ: "employee:self_read",
  DOCUMENT_READ: "document:read",
  DOCUMENT_UPLOAD: "document:upload",
  DOCUMENT_DELETE: "document:delete",
  AUDIT_READ: "audit:read",
  USER_MANAGE: "user:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [ROLES.ADMIN]: [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_UPDATE,
    PERMISSIONS.EMPLOYEE_DELETE,
    PERMISSIONS.EMPLOYEE_SELF_READ,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.DOCUMENT_DELETE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.USER_MANAGE,
  ],
  [ROLES.HR]: [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.EMPLOYEE_CREATE,
    PERMISSIONS.EMPLOYEE_UPDATE,
    PERMISSIONS.EMPLOYEE_SELF_READ,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.AUDIT_READ,
  ],
  [ROLES.MANAGER]: [
    PERMISSIONS.EMPLOYEE_READ,
    PERMISSIONS.EMPLOYEE_SELF_READ,
    PERMISSIONS.DOCUMENT_READ,
  ],
  [ROLES.EMPLOYEE]: [
    PERMISSIONS.EMPLOYEE_SELF_READ,
    PERMISSIONS.DOCUMENT_READ,
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return Boolean(permissions && permissions.includes(permission));
}
