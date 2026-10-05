import React from "react";
import { useAuth } from "../hooks/use-auth";
import { useExpirySummary } from "../hooks/use-expiry";
import type { ProfileTabType } from "./employees/employee-profile";
import { ActionCenterView } from "./action-center/action-center-view";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Users,
  UserCheck,
  UserMinus,
  AlertCircle,
  Clock,
  Plane as PassportIcon,
  CreditCard,
  FileText,
  Files,
  Loader2,
} from "lucide-react";

interface DashboardPageProps {
  onViewEmployee?: (employeeId: string, initialTab?: ProfileTabType) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onViewEmployee,
}) => {
  const { user } = useAuth();
  const { data: summary, isLoading: isSummaryLoading } = useExpirySummary();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.fullName}
          </h2>
          <p className="text-sm text-muted-foreground">
            HR Compliance, Workforce Overview & Document Expiry Tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 py-1 px-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="capitalize">{user?.role.replace("_", " ")} Role</span>
          </Badge>
        </div>
      </div>

      {/* 1. Workforce Summary Cards */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Workforce Status
        </h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          {/* Total Employees */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Total Employees
              </CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isSummaryLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  summary?.workforce.totalEmployees ?? 0
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Headcount registered</p>
            </CardContent>
          </Card>

          {/* Active Employees */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Active Workforce
              </CardTitle>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {isSummaryLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  summary?.workforce.activeEmployees ?? 0
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Active & on-probation</p>
            </CardContent>
          </Card>

          {/* Inactive Employees */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Inactive / Departed
              </CardTitle>
              <UserMinus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isSummaryLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  summary?.workforce.inactiveEmployees ?? 0
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Resigned or terminated</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2. Document Compliance Cards */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Document Expiry & Compliance
        </h3>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {/* Expired */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-destructive">
                Expired Documents
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {isSummaryLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  summary?.compliance.expired ?? 0
                )}
              </div>
              <p className="text-[11px] text-destructive/80 mt-1 font-medium">Immediate action needed</p>
            </CardContent>
          </Card>

          {/* 7 Days */}
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-semibold text-amber-600">
                Expiring in 7 Days
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {isSummaryLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  summary?.compliance.expiring7Days ?? 0
                )}
              </div>
              <p className="text-[11px] text-amber-600/80 mt-1 font-medium">Critical renewal window</p>
            </CardContent>
          </Card>

          {/* 30 Days */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Expiring in 30 Days
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isSummaryLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  summary?.compliance.expiring30Days ?? 0
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Pending submission</p>
            </CardContent>
          </Card>

          {/* 90 Days */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Expiring in 90 Days
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {isSummaryLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  summary?.compliance.expiring90Days ?? 0
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">Early pipeline tracking</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. Breakdown By Document Type */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Compliance by Document Type
        </h3>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Passport */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs">
            <div className="flex items-center gap-2">
              <PassportIcon className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="font-medium text-foreground">Passport</span>
            </div>
            <div className="flex items-center gap-1.5">
              {summary?.byType.passport.expired ? (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                  {summary.byType.passport.expired} expired
                </Badge>
              ) : null}
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {summary?.byType.passport.expiringSoon ?? 0} soon
              </Badge>
            </div>
          </div>

          {/* Visa */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-500 shrink-0" />
              <span className="font-medium text-foreground">Visa</span>
            </div>
            <div className="flex items-center gap-1.5">
              {summary?.byType.visa.expired ? (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                  {summary.byType.visa.expired} expired
                </Badge>
              ) : null}
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {summary?.byType.visa.expiringSoon ?? 0} soon
              </Badge>
            </div>
          </div>

          {/* Work Permit */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="font-medium text-foreground">Work Permit</span>
            </div>
            <div className="flex items-center gap-1.5">
              {summary?.byType.workPermit.expired ? (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                  {summary.byType.workPermit.expired} expired
                </Badge>
              ) : null}
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {summary?.byType.workPermit.expiringSoon ?? 0} soon
              </Badge>
            </div>
          </div>

          {/* Uploaded Documents */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-card text-xs">
            <div className="flex items-center gap-2">
              <Files className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="font-medium text-foreground">Uploaded Vault</span>
            </div>
            <div className="flex items-center gap-1.5">
              {summary?.byType.uploadedDocuments.expired ? (
                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                  {summary.byType.uploadedDocuments.expired} expired
                </Badge>
              ) : null}
              <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                {summary?.byType.uploadedDocuments.expiringSoon ?? 0} soon
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Prominent HR Action Center */}
      <ActionCenterView onViewEmployee={onViewEmployee} />
    </div>
  );
};
