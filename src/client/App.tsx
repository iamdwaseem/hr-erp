import React, { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import { AuthProvider, useAuth } from "./context/auth-context";
import { LoginPage } from "./pages/login";
import { DashboardPage } from "./pages/dashboard";
import { EmployeesPage } from "./pages/employees";
import { EmployeeProfile, type ProfileTabType } from "./pages/employees/employee-profile";
import { ActionCenterPage } from "./pages/action-center";
import { ModulePlaceholder } from "./pages/module-placeholder";
import { NotFoundPage } from "./pages/not-found";
import { AppLayout } from "./components/layout/app-layout";
import { ProtectedRoute } from "./components/layout/protected-route";
import { PERMISSIONS, ROLES } from "../shared/constants/roles";

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>("/dashboard");
  const [viewEmployeeId, setViewEmployeeId] = useState<string | null>(null);
  const [viewEmployeeTab, setViewEmployeeTab] = useState<ProfileTabType | undefined>(undefined);

  const handleViewEmployee = (employeeId: string, initialTab?: ProfileTabType) => {
    setViewEmployeeId(employeeId);
    setViewEmployeeTab(initialTab);
  };

  // If logged in as an EMPLOYEE, default path to /profile instead of /dashboard or /employees
  useEffect(() => {
    if (user?.role === ROLES.EMPLOYEE && currentPath === "/employees") {
      setCurrentPath("/profile");
    }
  }, [user, currentPath]);

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
      case "/audit":
        return {
          title: "Basic Audit Log",
          component: (
            <ProtectedRoute requiredPermission={PERMISSIONS.AUDIT_READ}>
              <ModulePlaceholder
                title="Basic Audit Log"
                description="Chronological log of administrative actions, logins, and document mutations will be implemented in subsequent phases."
              />
            </ProtectedRoute>
          ),
        };
      default:
        return {
          title: "Not Found",
          component: <NotFoundPage onGoHome={() => setCurrentPath(user?.role === ROLES.EMPLOYEE ? "/profile" : "/dashboard")} />,
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
