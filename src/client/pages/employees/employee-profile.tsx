import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Building,
  Briefcase,
  FileText,
  CreditCard,
  Plane,
  ShieldCheck,
  Clock,
  Loader2,
  AlertCircle,
  FileCheck2,
} from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../hooks/use-auth";
import { ROLES } from "../../../shared/constants/roles";
import type { Employee } from "../../../shared/types/employee";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { EmployeeFormDialog } from "./employee-form-dialog";

interface EmployeeProfileProps {
  employeeId: string;
  onBack?: () => void;
}

type TabType =
  | "overview"
  | "personal"
  | "employment"
  | "passport"
  | "visa"
  | "work_permit"
  | "documents";

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({
  employeeId,
  onBack,
}) => {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const canEdit = hasRole([ROLES.ADMIN, ROLES.HR]);
  const isEmployeeRole = user?.role === ROLES.EMPLOYEE;

  const {
    data: employee,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<Employee>({
    queryKey: ["employee", employeeId],
    queryFn: () => apiClient.get<Employee>(`/employees/${employeeId}`),
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading employee profile...</p>
        </div>
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <Card className="max-w-md text-center border-destructive/20">
          <CardHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-destructive">Unable to Load Profile</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : "Employee profile could not be loaded."}
            </p>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                Go Back
              </Button>
            )}
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "probation":
        return "warning";
      case "terminated":
      case "resigned":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Top action bar: back navigation and edit trigger */}
      <div className="flex items-center justify-between">
        {onBack && !isEmployeeRole ? (
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Employee Master</span>
          </Button>
        ) : (
          <div />
        )}

        {canEdit && (
          <Button onClick={() => setIsEditDialogOpen(true)} className="gap-2" size="sm">
            <Edit className="h-4 w-4" />
            <span>Edit Employee</span>
          </Button>
        )}
      </div>

      {/* Top Header Section */}
      <Card className="overflow-hidden border shadow-sm">
        <div className="h-24 bg-gradient-to-r from-primary/10 via-primary/5 to-background" />
        <CardContent className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
              {/* Profile Photo or Initials Avatar */}
              <div className="h-24 w-24 rounded-2xl border-4 border-background bg-card shadow-md overflow-hidden flex items-center justify-center font-bold text-2xl text-primary shrink-0">
                {employee.profilePhotoUrl ? (
                  <img
                    src={employee.profilePhotoUrl}
                    alt={employee.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{getInitials(employee.fullName)}</span>
                )}
              </div>

              {/* Title & Identifiers */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    {employee.fullName}
                  </h2>
                  <Badge variant={getStatusBadgeVariant(employee.employmentStatus)}>
                    {employee.employmentStatus.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-muted-foreground">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                    Code: {employee.employeeCode}
                  </span>
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                    ID: {employee.employeeId}
                  </span>
                  {employee.nationality && (
                    <span className="text-xs">{employee.nationality}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Department / Designation / Branch pills */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 text-xs">
              {employee.department && (
                <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                  <Building className="h-3.5 w-3.5" />
                  <span>{employee.department.name}</span>
                </div>
              )}
              {employee.designation && (
                <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>{employee.designation.name}</span>
                </div>
              )}
              {employee.branch && (
                <div className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2.5 py-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{employee.branch.name}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <div className="border-b">
        <div className="flex gap-2 overflow-x-auto pb-px">
          {[
            { id: "overview", label: "Overview", icon: ShieldCheck },
            { id: "personal", label: "Personal", icon: Briefcase },
            { id: "employment", label: "Employment", icon: Building },
            { id: "passport", label: "Passport", icon: Plane, phase2: true },
            { id: "visa", label: "Visa", icon: FileText, phase2: true },
            { id: "work_permit", label: "Work Permit", icon: CreditCard, phase2: true },
            { id: "documents", label: "Documents", icon: FileCheck2, phase2: true },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.phase2 && (
                  <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground font-normal">
                    Phase 2
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === "overview" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Contact Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{employee.email || "No email registered"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{employee.mobile || "No mobile registered"}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-foreground">
                  {[employee.addressLine, employee.city, employee.state, employee.country]
                    .filter(Boolean)
                    .join(", ") || "No address registered"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Key dates summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Employment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Joining Date</span>
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {employee.joiningDate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium text-foreground">{employee.department?.name || "Unassigned"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Designation</span>
                <span className="font-medium text-foreground">{employee.designation?.name || "Unassigned"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Work Location</span>
                <span className="font-medium text-foreground">{employee.branch?.name || "Unassigned"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "personal" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Full Name</dt>
                <dd className="mt-1 font-medium text-foreground">{employee.fullName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Gender</dt>
                <dd className="mt-1 font-medium text-foreground capitalize">{employee.gender || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Date of Birth</dt>
                <dd className="mt-1 font-medium text-foreground">{employee.dateOfBirth || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Nationality</dt>
                <dd className="mt-1 font-medium text-foreground">{employee.nationality || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Mobile Number</dt>
                <dd className="mt-1 font-medium text-foreground">{employee.mobile || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Email Address</dt>
                <dd className="mt-1 font-medium text-foreground">{employee.email || "Not specified"}</dd>
              </div>
              <div className="sm:col-span-2 md:col-span-3">
                <dt className="text-xs text-muted-foreground uppercase font-medium">Full Address</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {[employee.addressLine, employee.city, employee.state, employee.country]
                    .filter(Boolean)
                    .join(", ") || "Not specified"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {activeTab === "employment" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Employment Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Employee Code</dt>
                <dd className="mt-1 font-mono font-medium text-foreground">{employee.employeeCode}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Employee ID</dt>
                <dd className="mt-1 font-mono font-medium text-foreground">{employee.employeeId}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Employment Status</dt>
                <dd className="mt-1">
                  <Badge variant={getStatusBadgeVariant(employee.employmentStatus)}>
                    {employee.employmentStatus.toUpperCase()}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Joining Date</dt>
                <dd className="mt-1 font-medium text-foreground">{employee.joiningDate}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Department</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {employee.department ? `${employee.department.name} (${employee.department.code})` : "Unassigned"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Designation</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {employee.designation ? `${employee.designation.name} (${employee.designation.code})` : "Unassigned"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Branch Location</dt>
                <dd className="mt-1 font-medium text-foreground">
                  {employee.branch ? `${employee.branch.name} (${employee.branch.code})` : "Unassigned"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Record Created</dt>
                <dd className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(employee.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground uppercase font-medium">Last Updated</dt>
                <dd className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(employee.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Placeholders for subsequent phases (Passport, Visa, Work Permit, Documents) */}
      {activeTab === "passport" && (
        <Card className="border-dashed text-center py-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Plane className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4 text-lg">Passport Details</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Passport number, issue country, issue date, and expiry tracking will be available in the upcoming phase.
          </p>
        </Card>
      )}

      {activeTab === "visa" && (
        <Card className="border-dashed text-center py-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4 text-lg">Visa Details</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Visa number, type, sponsor, and visa expiry tracking will be available in the upcoming phase.
          </p>
        </Card>
      )}

      {activeTab === "work_permit" && (
        <Card className="border-dashed text-center py-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CreditCard className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4 text-lg">Work Permit Details</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Work permit / labor card details and renewal workflows will be available in the upcoming phase.
          </p>
        </Card>
      )}

      {activeTab === "documents" && (
        <Card className="border-dashed text-center py-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4 text-lg">Documents & R2 Storage</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Cloudflare R2 document upload, storage, verification, and expiry tracking will be available in the upcoming phase.
          </p>
        </Card>
      )}

      {/* Edit Employee Modal */}
      {isEditDialogOpen && (
        <EmployeeFormDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          employeeToEdit={employee}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};
