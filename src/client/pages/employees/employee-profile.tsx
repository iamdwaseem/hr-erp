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
  User,
  Globe,
  HeartHandshake,
  PhoneCall,
  Bus,
  Trash2,
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
import {
  useEmployeeCurrentAssignment,
  useEmployeeAssignmentHistory,
} from "../../hooks/use-transport";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { PassportDialog } from "./passport-dialog";
import { VisaDialog } from "./visa-dialog";
import { WorkPermitDialog } from "./work-permit-dialog";
import { DocumentVaultTab } from "./document-vault-tab";

export type ProfileTabType =
  | "overview"
  | "personal"
  | "contact"
  | "employment"
  | "passport"
  | "visa"
  | "work_permit"
  | "documents"
  | "transport";

interface EmployeeProfileProps {
  employeeId: string;
  onBack?: () => void;
  initialTab?: ProfileTabType;
}

export const EmployeeProfile: React.FC<EmployeeProfileProps> = ({
  employeeId,
  onBack,
  initialTab = "overview",
}) => {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTabType>(initialTab);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Document Dialog states
  const [isPassportDialogOpen, setIsPassportDialogOpen] = useState(false);
  const [isVisaDialogOpen, setIsVisaDialogOpen] = useState(false);
  const [isWorkPermitDialogOpen, setIsWorkPermitDialogOpen] = useState(false);

  const canEdit = hasRole([ROLES.ADMIN, ROLES.HR]);
  const isAdmin = hasRole(ROLES.ADMIN);
  const isEmployeeRole = false;

  const handleDeleteEmployee = async () => {
    if (!employee) return;
    const confirmed = window.confirm(
      `PERMANENT DELETE WARNING:\n\nAre you sure you want to permanently delete employee "${employee.fullName}" (${employee.employeeCode})?\n\nThis will permanently remove all associated documents, passports, visas, work permits, and transport assignments. This action CANNOT be undone.`
    );
    if (!confirmed) return;

    try {
      await apiClient.delete(`/employees/${employee.id}`);
      if (onBack) {
        onBack();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete employee");
    }
  };

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

  // 3. Transport Queries
  const { data: currentTransport, isLoading: isTransportLoading } = useEmployeeCurrentAssignment(effectiveId);
  const { data: transportHistory = [], isLoading: isHistoryLoading } = useEmployeeAssignmentHistory(effectiveId);

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

  const renderContactCards = () => (
    <div className="space-y-6">
      {/* Local / Work-Country Contact */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Local / Work-Country Contact</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Current local residence and work-country communication details
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Local Email</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.localEmail || employee.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Local Mobile</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.localMobile || employee.mobile || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Local City</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.localCity || employee.city || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Local State / Emirate</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.localState || employee.state || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Postal / Zip Code</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.localPostalCode || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Local Country</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.localCountry || employee.country || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground uppercase font-medium">Address Line 1</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.localAddressLine1 || employee.addressLine || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground uppercase font-medium">Address Line 2</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.localAddressLine2 || "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Home-Country Contact */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Home-Country Contact</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Permanent address and contact details in home country (for expatriate / foreign workforce)
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Home Email</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.homeEmail || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Home Mobile</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.homeMobile || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Alternate Phone</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.homeAlternatePhone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Home Country</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.homeCountry || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">City</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.homeCity || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">State / Province</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.homeState || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Postal / Zip Code</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.homePostalCode || "—"}</dd>
            </div>
            <div className="hidden sm:block" />
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground uppercase font-medium">Address Line 1</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.homeAddressLine1 || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground uppercase font-medium">Address Line 2</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.homeAddressLine2 || "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Emergency Contact</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Designated contact person and details in case of critical incident or emergency
          </p>
        </CardHeader>
        <CardContent className="pt-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Contact Person Name</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.emergencyContactName || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Relationship</dt>
              <dd className="mt-1 font-medium text-foreground capitalize">{employee.emergencyContactRelationship || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Emergency Mobile</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.emergencyContactMobile || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Alternate Phone</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.emergencyContactAlternatePhone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase font-medium">Email Address</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.emergencyContactEmail || "—"}</dd>
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <dt className="text-xs text-muted-foreground uppercase font-medium">Emergency Physical Address</dt>
              <dd className="mt-1 font-medium text-foreground">{employee.emergencyContactAddress || "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );

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

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button onClick={() => setIsEditDialogOpen(true)} className="gap-2" size="sm">
              <Edit className="h-4 w-4" />
              <span>Edit Employee</span>
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="destructive"
              onClick={handleDeleteEmployee}
              className="gap-2"
              size="sm"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Employee</span>
            </Button>
          )}
        </div>
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
            { id: "personal", label: "Personal", icon: User },
            { id: "contact", label: "Contact & Emergency", icon: PhoneCall },
            { id: "employment", label: "Employment", icon: Building },
            { id: "passport", label: "Passport", icon: Plane },
            { id: "visa", label: "Visa", icon: FileText },
            { id: "work_permit", label: "Work Permit", icon: CreditCard },
            { id: "documents", label: "Documents", icon: FileCheck2 },
            { id: "transport", label: "Transport", icon: Bus },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ProfileTabType)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
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
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Contact Overview</CardTitle>
              <Badge variant="outline" className="text-xs">Local & Emergency</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{employee.localEmail || employee.email || "No local email registered"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{employee.localMobile || employee.mobile || "No local mobile registered"}</span>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-foreground">
                  {[
                    employee.localAddressLine1 || employee.addressLine,
                    employee.localAddressLine2,
                    employee.localCity || employee.city,
                    employee.localState || employee.state,
                    employee.localPostalCode,
                    employee.localCountry || employee.country
                  ]
                    .filter(Boolean)
                    .join(", ") || "No local address registered"}
                </span>
              </div>
              {(employee.emergencyContactName || employee.emergencyContactMobile) && (
                <div className="pt-2 border-t mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <HeartHandshake className="h-3.5 w-3.5 text-primary" />
                    Emergency Contact:
                  </span>
                  <span>
                    {employee.emergencyContactName} ({employee.emergencyContactRelationship || "Contact"}): {employee.emergencyContactMobile || "—"}
                  </span>
                </div>
              )}
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

          {/* Transport summary card */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Bus className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">Transport & Commute</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => setActiveTab("transport")}
              >
                View History & Details →
              </Button>
            </CardHeader>
            <CardContent>
              {isTransportLoading ? (
                <div className="py-2 text-xs text-muted-foreground">Loading transport details...</div>
              ) : currentTransport ? (
                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Assigned Route</dt>
                    <dd className="mt-1 font-semibold text-foreground">
                      {currentTransport.route?.name} ({currentTransport.route?.code})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Pickup Point</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {currentTransport.pickupPoint || "Standard route stop"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Vehicle / Driver</dt>
                    <dd className="mt-1 text-foreground">
                      {currentTransport.vehicle ? (
                        <span>
                          {currentTransport.vehicle.registrationNumber}
                          {currentTransport.vehicle.driverName ? ` (${currentTransport.vehicle.driverName})` : ""}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Flexible / Unassigned</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Effective Period</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      From {currentTransport.effectiveFrom}
                      {currentTransport.effectiveTo ? ` to ${currentTransport.effectiveTo}` : " (Ongoing)"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="flex items-center justify-between py-1 text-xs text-muted-foreground">
                  <span>No active transport assignment currently configured for this employee.</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setActiveTab("transport")}
                  >
                    Configure Transport
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Contents: Personal */}
      {activeTab === "personal" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">Personal Identification</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground uppercase font-medium">Full Name</dt>
                  <dd className="mt-1 font-medium text-foreground">{employee.fullName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground uppercase font-medium">Employee Code</dt>
                  <dd className="mt-1 font-mono font-medium text-foreground">{employee.employeeCode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground uppercase font-medium">Employee ID</dt>
                  <dd className="mt-1 font-mono font-medium text-foreground">{employee.employeeId}</dd>
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
              </dl>
            </CardContent>
          </Card>

          {renderContactCards()}
        </div>
      )}

      {/* Tab Contents: Contact & Emergency */}
      {activeTab === "contact" && (
        <div className="space-y-6">
          {renderContactCards()}
        </div>
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
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Status / Days Remaining</dt>
                    <dd className="mt-1 font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                      <span>{DOCUMENT_STATUS_CONFIG[passport.status].label}</span>
                      {passport.daysRemaining !== undefined && passport.daysRemaining !== null && (
                        <span className="text-xs text-muted-foreground">
                          ({passport.daysRemaining < 0
                            ? `Expired ${Math.abs(passport.daysRemaining)}d ago`
                            : `${passport.daysRemaining} days remaining`})
                        </span>
                      )}
                    </dd>
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
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Status / Days Remaining</dt>
                    <dd className="mt-1 font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                      <span>{DOCUMENT_STATUS_CONFIG[visa.status].label}</span>
                      {visa.daysRemaining !== undefined && visa.daysRemaining !== null && (
                        <span className="text-xs text-muted-foreground">
                          ({visa.daysRemaining < 0
                            ? `Expired ${Math.abs(visa.daysRemaining)}d ago`
                            : `${visa.daysRemaining} days remaining`})
                        </span>
                      )}
                    </dd>
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
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Status / Days Remaining</dt>
                    <dd className="mt-1 font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                      <span>{DOCUMENT_STATUS_CONFIG[workPermit.status].label}</span>
                      {workPermit.daysRemaining !== undefined && workPermit.daysRemaining !== null && (
                        <span className="text-xs text-muted-foreground">
                          ({workPermit.daysRemaining < 0
                            ? `Expired ${Math.abs(workPermit.daysRemaining)}d ago`
                            : `${workPermit.daysRemaining} days remaining`})
                        </span>
                      )}
                    </dd>
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

      {/* Tab Contents: Transport */}
      {activeTab === "transport" && (
        <div className="space-y-6">
          {/* Current Active Assignment */}
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Bus className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">Active Transport Allocation</CardTitle>
              </div>
              {currentTransport && (
                <Badge variant={currentTransport.status === "active" ? "default" : "secondary"}>
                  {currentTransport.status.toUpperCase()}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="pt-4">
              {isTransportLoading ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : currentTransport ? (
                <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Route</dt>
                    <dd className="mt-1 font-semibold text-foreground">
                      {currentTransport.route?.name}
                    </dd>
                    <dd className="text-xs text-muted-foreground font-mono">
                      {currentTransport.route?.code}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Pickup Point</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {currentTransport.pickupPoint || "Standard pickup location"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Assigned Vehicle</dt>
                    <dd className="mt-1 font-semibold text-foreground">
                      {currentTransport.vehicle ? currentTransport.vehicle.registrationNumber : "Flexible / Unassigned"}
                    </dd>
                    {currentTransport.vehicle && (
                      <dd className="text-xs text-muted-foreground">
                        {currentTransport.vehicle.vehicleType}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Driver Information</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {currentTransport.vehicle?.driverName || "Driver details pending"}
                    </dd>
                    {currentTransport.vehicle?.driverPhone && (
                      <dd className="text-xs text-muted-foreground">
                        {currentTransport.vehicle.driverPhone}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground uppercase font-medium">Effective Period</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      From {currentTransport.effectiveFrom}
                    </dd>
                    <dd className="text-xs text-muted-foreground">
                      {currentTransport.effectiveTo ? `To ${currentTransport.effectiveTo}` : "Ongoing commitment"}
                    </dd>
                  </div>
                  {currentTransport.notes && (
                    <div className="sm:col-span-2 md:col-span-3">
                      <dt className="text-xs text-muted-foreground uppercase font-medium">Notes</dt>
                      <dd className="mt-1 text-xs text-foreground bg-muted/40 p-2 rounded">
                        {currentTransport.notes}
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  <p>No active transport assignment currently active for this employee.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transport History */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Assignment History</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Complete record of previous and present transport arrangements
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {isHistoryLoading ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : transportHistory.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No transport history recorded for this employee.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="py-2.5 px-4">Route</th>
                        <th className="py-2.5 px-4">Vehicle</th>
                        <th className="py-2.5 px-4">Pickup Point</th>
                        <th className="py-2.5 px-4">From</th>
                        <th className="py-2.5 px-4">To</th>
                        <th className="py-2.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {transportHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-muted/30">
                          <td className="py-2.5 px-4 font-medium text-foreground">
                            {h.route?.name} <span className="text-muted-foreground">({h.route?.code})</span>
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground">
                            {h.vehicle ? h.vehicle.registrationNumber : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-muted-foreground">
                            {h.pickupPoint || "—"}
                          </td>
                          <td className="py-2.5 px-4 text-foreground">{h.effectiveFrom}</td>
                          <td className="py-2.5 px-4 text-muted-foreground">{h.effectiveTo || "Ongoing"}</td>
                          <td className="py-2.5 px-4">
                            <Badge variant={h.status === "active" ? "default" : "secondary"} className="text-[10px]">
                              {h.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
