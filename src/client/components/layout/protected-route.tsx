import React from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "../../hooks/use-auth";
import type { UserRole, Permission } from "../../../shared/constants/roles";
import { Card, CardHeader, CardTitle, CardDescription } from "../ui/card";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
  requiredPermission?: Permission;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
}) => {
  const { isAuthenticated, isLoading, hasRole, can } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Card className="max-w-md text-center border-destructive/30">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-destructive">Access Restricted</CardTitle>
            <CardDescription>
              Your account does not possess the required RBAC role permissions to view this resource.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (requiredPermission && !can(requiredPermission)) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <Card className="max-w-md text-center border-destructive/30">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-destructive">Permission Denied</CardTitle>
            <CardDescription>
              Your current role does not have the <code className="font-mono text-xs">{requiredPermission}</code> permission.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
