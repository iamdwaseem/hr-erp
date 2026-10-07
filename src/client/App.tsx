import React, { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import { AuthProvider, useAuth } from "./context/auth-context";
import { LoginPage } from "./pages/login";
import { DashboardPage } from "./pages/dashboard";
import { EmployeesPage } from "./pages/employees";
import { EmployeeProfile, type ProfileTabType } from "./pages/employees/employee-profile";
import { ActionCenterPage } from "./pages/action-center";
import { AuditLogPage } from "./pages/audit-log";
import { UsersPage } from "./pages/settings/users-page";
import { MastersPage } from "./pages/settings/masters-page";
import { NotFoundPage } from "./pages/not-found";
import { AppLayout } from "./components/layout/app-layout";
import { ProtectedRoute } from "./components/layout/protected-route";
import { PERMISSIONS } from "../shared/constants/roles";

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>("/dashboard");
  const [viewEmployeeId, setViewEmployeeId] = useState<string | null>(null);
  const [viewEmployeeTab, setViewEmployeeTab] = useState<ProfileTabType | undefined>(undefined);

  const handleViewEmployee = (employeeId: string, initialTab?: ProfileTabType) => {
    setViewEmployeeId(employeeId);
    setViewEmployeeTab(initialTab);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (viewEmployeeId) {
    return (
      <AppLayout
        currentPath={currentPath}
        onNavigate={(path) => {
          setViewEmployeeId(null);
          setCurrentPath(path);
        }}
        pageTitle="Employee Profile"
      >
        <EmployeeProfile
          employeeId={viewEmployeeId}
          initialTab={viewEmployeeTab}
          onBack={() => setViewEmployeeId(null)}
        />
      </AppLayout>
    );
  }

  const getPageInfo = () => {
    switch (currentPath) {
      case "/dashboard":
        return {
          title: "HR Dashboard",
          component: <DashboardPage onViewEmployee={handleViewEmployee} />,
        };
      case "/profile":
        return {
          title: "My Profile",
          component: <EmployeeProfile employeeId="me" />,
        };
      case "/employees":
        return {
          title: "Employee Master",
          component: (
            <ProtectedRoute requiredPermission={PERMISSIONS.EMPLOYEE_READ}>
              <EmployeesPage />
            </ProtectedRoute>
          ),
        };
      case "/action-center":
        return {
          title: "HR Action Center",
          component: <ActionCenterPage onViewEmployee={handleViewEmployee} />,
        };
      case "/audit-log":
      case "/audit":
        return {
          title: "Audit Log Viewer",
          component: (
            <ProtectedRoute requiredPermission={PERMISSIONS.AUDIT_READ}>
              <AuditLogPage />
            </ProtectedRoute>
          ),
        };
      case "/settings/users":
        return {
          title: "User Management",
          component: (
            <ProtectedRoute requiredPermission={PERMISSIONS.USER_MANAGE}>
              <UsersPage />
            </ProtectedRoute>
          ),
        };
      case "/settings/masters":
        return {
          title: "System Master Configuration",
          component: (
            <ProtectedRoute requiredPermission={PERMISSIONS.MASTER_MANAGE}>
              <MastersPage />
            </ProtectedRoute>
          ),
        };
      default:
        return {
          title: "Not Found",
          component: <NotFoundPage onGoHome={() => setCurrentPath("/dashboard")} />,
        };
    }
  };

  const { title, component } = getPageInfo();

  return (
    <AppLayout
      currentPath={currentPath}
      onNavigate={setCurrentPath}
      pageTitle={title}
    >
      {component}
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
