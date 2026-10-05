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
  PlusCircle,
} from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../hooks/use-auth";
import { ROLES } from "../../../shared/constants/roles";
import type { Employee } from "../../../shared/types/employee";
import { DOCUMENT_STATUS_CONFIG } from "../../../shared/types/document";
import {
  usePassport,
  useVisa,
  useWorkPermit,
} from "../../hooks/use-documents";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { PassportDialog } from "./passport-dialog";
import { VisaDialog } from "./visa-dialog";
import { WorkPermitDialog } from "./work-permit-dialog";
import { DocumentVaultTab } from "./document-vault-tab";

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

  // Document Dialog states
  const [isPassportDialogOpen, setIsPassportDialogOpen] = useState(false);
  const [isVisaDialogOpen, setIsVisaDialogOpen] = useState(false);
  const [isWorkPermitDialogOpen, setIsWorkPermitDialogOpen] = useState(false);

  const canEdit = hasRole([ROLES.ADMIN, ROLES.HR]);
  const isEmployeeRole = user?.role === ROLES.EMPLOYEE;

  // 1. Fetch Employee Record
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

  // Effective employee ID (if 'me', resolved ID after load)
  const effectiveId = employee?.id || employeeId;

  // 2. Document Queries
  const { data: passport, isLoading: isPassportLoading } = usePassport(effectiveId);
  const { data: visa, isLoading: isVisaLoading } = useVisa(effectiveId);
  const { data: workPermit, isLoading: isWorkPermitLoading } = useWorkPermit(effectiveId);

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
            { id: "passport", label: "Passport", icon: Plane },
            { id: "visa", label: "Visa", icon: FileText },
            { id: "work_permit", label: "Work Permit", icon: CreditCard },
            { id: "documents", label: "Documents", icon: FileCheck2, comingSoon: true },
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
                {tab.comingSoon && (
                  <span className="rounded bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground font-normal">
                    Next Phase
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents: Overview */}
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

      {/* Tab Contents: Personal */}
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

      {/* Tab Contents: Employment */}
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

      {/* Tab Contents: Passport (Functional) */}
      {activeTab === "passport" && (
        <div>
          {isPassportLoading ? (
            <div className="flex min-h-[200px] items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !passport ? (
            <Card className="border-dashed text-center py-12">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Plane className="h-6 w-6" />
              </div>
              <CardTitle className="mt-4 text-lg">No passport details added yet</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                No active passport record found for this employee.
              </p>
              {canEdit && (
                <div className="mt-6">
                  <Button onClick={() => setIsPassportDialogOpen(true)} className="gap-2" size="sm">
                    <PlusCircle className="h-4 w-4" />
                    <span>Add Passport</span>
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Plane className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Passport Document</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Official international travel identification
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={DOCUMENT_STATUS_CONFIG[passport.status].variant}>
                    {DOCUMENT_STATUS_CONFIG[passport.status].label}
                  </Badge>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsPassportDialogOpen(true)}
                      className="gap-1.5"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Passport Number</dt>
                    <dd className="mt-1 font-mono font-medium text-foreground">{passport.passportNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Nationality / Issuing State</dt>
                    <dd className="mt-1 font-medium text-foreground">{passport.nationality}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Place of Issue</dt>
                    <dd className="mt-1 font-medium text-foreground">{passport.placeOfIssue || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Issue Date</dt>
                    <dd className="mt-1 font-medium text-foreground">{passport.issueDate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Expiry Date</dt>
                    <dd className="mt-1 font-medium text-foreground">{passport.expiryDate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Status Calculation</dt>
                    <dd className="mt-1 font-medium text-foreground">{DOCUMENT_STATUS_CONFIG[passport.status].label}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab Contents: Visa (Functional) */}
      {activeTab === "visa" && (
        <div>
          {isVisaLoading ? (
            <div className="flex min-h-[200px] items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !visa ? (
            <Card className="border-dashed text-center py-12">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <CardTitle className="mt-4 text-lg">No visa details added yet</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                No active visa record found for this employee.
              </p>
              {canEdit && (
                <div className="mt-6">
                  <Button onClick={() => setIsVisaDialogOpen(true)} className="gap-2" size="sm">
                    <PlusCircle className="h-4 w-4" />
                    <span>Add Visa</span>
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Visa Record</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Entry permit and residence status authorization
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={DOCUMENT_STATUS_CONFIG[visa.status].variant}>
                    {DOCUMENT_STATUS_CONFIG[visa.status].label}
                  </Badge>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsVisaDialogOpen(true)}
                      className="gap-1.5"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Visa / UID Number</dt>
                    <dd className="mt-1 font-mono font-medium text-foreground">{visa.visaNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Visa Type</dt>
                    <dd className="mt-1 font-medium text-foreground">{visa.visaType}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Issuing State / Emirate</dt>
                    <dd className="mt-1 font-medium text-foreground">{visa.issuingState || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Profession on Visa</dt>
                    <dd className="mt-1 font-medium text-foreground">{visa.profession || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Issue Date</dt>
                    <dd className="mt-1 font-medium text-foreground">{visa.issueDate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Expiry Date</dt>
                    <dd className="mt-1 font-medium text-foreground">{visa.expiryDate}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Sponsor Name</dt>
                    <dd className="mt-1 font-medium text-foreground">{visa.sponsorName || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Status Calculation</dt>
                    <dd className="mt-1 font-medium text-foreground">{DOCUMENT_STATUS_CONFIG[visa.status].label}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab Contents: Work Permit (Functional) */}
      {activeTab === "work_permit" && (
        <div>
          {isWorkPermitLoading ? (
            <div className="flex min-h-[200px] items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !workPermit ? (
            <Card className="border-dashed text-center py-12">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CreditCard className="h-6 w-6" />
              </div>
              <CardTitle className="mt-4 text-lg">No work permit details added yet</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                No active labor card / work permit record found for this employee.
              </p>
              {canEdit && (
                <div className="mt-6">
                  <Button onClick={() => setIsWorkPermitDialogOpen(true)} className="gap-2" size="sm">
                    <PlusCircle className="h-4 w-4" />
                    <span>Add Work Permit</span>
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Work Permit / Labor Card</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Statutory employment authorization details
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant={DOCUMENT_STATUS_CONFIG[workPermit.status].variant}>
                    {DOCUMENT_STATUS_CONFIG[workPermit.status].label}
                  </Badge>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsWorkPermitDialogOpen(true)}
                      className="gap-1.5"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Permit / Card Number</dt>
                    <dd className="mt-1 font-mono font-medium text-foreground">{workPermit.permitNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Profession</dt>
                    <dd className="mt-1 font-medium text-foreground">{workPermit.profession || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Status Calculation</dt>
                    <dd className="mt-1 font-medium text-foreground">{DOCUMENT_STATUS_CONFIG[workPermit.status].label}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Issue Date</dt>
                    <dd className="mt-1 font-medium text-foreground">{workPermit.issueDate}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Expiry Date</dt>
                    <dd className="mt-1 font-medium text-foreground">{workPermit.expiryDate}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tab Contents: Documents (Document Vault) */}
      {activeTab === "documents" && (
        <DocumentVaultTab
          employeeId={effectiveId}
          canManage={canEdit}
        />
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

      {/* Passport Dialog */}
      {isPassportDialogOpen && (
        <PassportDialog
          isOpen={isPassportDialogOpen}
          onClose={() => setIsPassportDialogOpen(false)}
          employeeId={effectiveId}
          existingData={passport}
          defaultNationality={employee.nationality}
        />
      )}

      {/* Visa Dialog */}
      {isVisaDialogOpen && (
        <VisaDialog
          isOpen={isVisaDialogOpen}
          onClose={() => setIsVisaDialogOpen(false)}
          employeeId={effectiveId}
          existingData={visa}
          defaultProfession={employee.designation?.name}
        />
      )}

      {/* Work Permit Dialog */}
      {isWorkPermitDialogOpen && (
        <WorkPermitDialog
          isOpen={isWorkPermitDialogOpen}
          onClose={() => setIsWorkPermitDialogOpen(false)}
          employeeId={effectiveId}
          existingData={workPermit}
          defaultProfession={employee.designation?.name}
        />
      )}
    </div>
  );
};
