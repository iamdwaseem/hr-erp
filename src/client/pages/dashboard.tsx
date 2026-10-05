import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Server, Database, HardDrive, ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { apiClient } from "../lib/api-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

interface HealthCheckData {
  status: string;
  service: string;
  environment: string;
  bindings: {
    d1: string;
    r2: string;
  };
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const { data: health, isLoading: isHealthLoading } = useQuery<HealthCheckData>({
    queryKey: ["health"],
    queryFn: () => apiClient.get<HealthCheckData>("/health"),
  });

  return (
    <div className="space-y-6">
      {/* Header welcome banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.fullName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Core HR ERP Platform is active on Cloudflare Workers Edge.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 py-1 px-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="capitalize">{user?.role.replace("_", " ")} Role</span>
          </Badge>
        </div>
      </div>

      {/* Infrastructure & Stack Readiness Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Worker Runtime */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Edge Runtime</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">Cloudflare Worker</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 inline" />
              Hono v4 Framework
            </p>
          </CardContent>
        </Card>

        {/* Cloudflare D1 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">Cloudflare D1</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {isHealthLoading ? (
                <span>Checking...</span>
              ) : health?.bindings?.d1 === "connected" ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500 inline" />
                  Drizzle ORM Connected
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-amber-500 inline" />
                  Status: {health?.bindings?.d1 || "Configured"}
                </>
              )}
            </p>
          </CardContent>
        </Card>

        {/* Cloudflare R2 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Object Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">Cloudflare R2</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 inline" />
              Bucket Binding Ready
            </p>
          </CardContent>
        </Card>

        {/* RBAC Security */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Security & RBAC</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground">Active</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500 inline" />
              Role Enforcement Enabled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Baseline Module Scaffold Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Architecture Status</CardTitle>
          <CardDescription>
            Core foundation and abstractions are verified and ready for business module implementation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold text-sm mb-1">Architecture Base</h4>
              <p className="text-xs text-muted-foreground">
                Hono routing, Drizzle D1 schema, error handling middleware, request ID tracking, and edge JWT.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold text-sm mb-1">UI & Client Base</h4>
              <p className="text-xs text-muted-foreground">
                Tailwind CSS, shadcn-ready primitives, TanStack Query provider, typed ApiClient, and responsive Layout.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h4 className="font-semibold text-sm mb-1">Upcoming Modules</h4>
              <p className="text-xs text-muted-foreground">
                Employee Master, Passport/Visa/Work Permit tracking, R2 document upload, Expiry Tracking & Audit Log.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
