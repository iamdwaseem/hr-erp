import React, { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/query-client";
import { AuthProvider, useAuth } from "./context/auth-context";
import { LoginPage } from "./pages/login";
import { DashboardPage } from "./pages/dashboard";
import { ModulePlaceholder } from "./pages/module-placeholder";
import { NotFoundPage } from "./pages/not-found";
import { AppLayout } from "./components/layout/app-layout";
import { ProtectedRoute } from "./components/layout/protected-route";
import { PERMISSIONS } from "../shared/constants/roles";

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>("/dashboard");

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

  const getPageInfo = () => {
    switch (currentPath) {
      case "/dashboard":
        return {
          title: "HR Dashboard",
          component: <DashboardPage />,
        };
      case "/employees":
        return {
          title: "Employee Master",
          component: (
            <ProtectedRoute requiredPermission={PERMISSIONS.EMPLOYEE_READ}>
              <ModulePlaceholder
                title="Employee Master"
                description="Core Employee Master module with Add/Edit, Profile, Passport, Visa, Work Permit, and R2 Document storage will be implemented in Phase 1."
              />
            </ProtectedRoute>
          ),
        };
      case "/action-center":
        return {
          title: "HR Action Center",
          component: (
            <ModulePlaceholder
              title="HR Action Center"
              description="Document Expiry Tracking, alert badges, and pending HR action queues will be implemented in Phase 1."
            />
          ),
        };
      case "/audit":
        return {
          title: "Basic Audit Log",
          component: (
            <ProtectedRoute requiredPermission={PERMISSIONS.AUDIT_READ}>
              <ModulePlaceholder
                title="Basic Audit Log"
                description="Chronological log of administrative actions, logins, and document mutations will be implemented in Phase 1."
              />
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
