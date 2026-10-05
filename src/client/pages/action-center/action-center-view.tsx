import { useState } from "react";
import {
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_CONFIG,
  DOCUMENT_TYPE_LABELS,
  type DocumentStatus,
} from "../../../shared/types/document";
import type { ProfileTabType } from "../employees/employee-profile";
import { useExpiringDocuments } from "../../hooks/use-expiry";
import { useDepartments, useBranches } from "../../hooks/use-masters";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  AlertTriangle,
  Search,
  ArrowRight,
  Loader2,
  FileCheck2,
  Plane as PassportIcon,
  CreditCard,
  FileText,
  Building2,
  MapPin,
} from "lucide-react";

interface ActionCenterViewProps {
  onViewEmployee?: (employeeId: string, initialTab?: ProfileTabType) => void;
  defaultStatusFilter?: string;
  showTitle?: boolean;
}

export function ActionCenterView({
  onViewEmployee,
  defaultStatusFilter = "all",
  showTitle = true,
}: ActionCenterViewProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>(defaultStatusFilter);
  const [selectedDocType, setSelectedDocType] = useState<string>("all");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data: departments } = useDepartments();
  const { data: branches } = useBranches();

  const {
    data: items,
    isLoading,
    isError,
    refetch,
  } = useExpiringDocuments({
    status: selectedStatus,
    documentType: selectedDocType,
    departmentId: selectedDept,
    branchId: selectedBranch,
    search: searchTerm,
  });

  const getDocTypeIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case "PASSPORT":
        return <PassportIcon className="h-4 w-4 text-blue-500 shrink-0" />;
      case "VISA":
        return <FileText className="h-4 w-4 text-purple-500 shrink-0" />;
      case "WORK_PERMIT":
        return <CreditCard className="h-4 w-4 text-emerald-500 shrink-0" />;
      default:
        return <FileText className="h-4 w-4 text-amber-500 shrink-0" />;
    }
  };

  const mapDocTypeToTab = (type: string): ProfileTabType => {
    switch (type.toUpperCase()) {
      case "PASSPORT":
        return "passport";
      case "VISA":
        return "visa";
      case "WORK_PERMIT":
        return "work_permit";
      default:
        return "documents";
    }
  };

  const getUrgencyRowClass = (status: DocumentStatus) => {
    switch (status) {
      case DOCUMENT_STATUSES.EXPIRED:
        return "bg-destructive/5 hover:bg-destructive/10 border-l-4 border-l-destructive";
      case DOCUMENT_STATUSES.EXPIRING_7_DAYS:
        return "bg-amber-500/5 hover:bg-amber-500/10 border-l-4 border-l-amber-500";
      case DOCUMENT_STATUSES.EXPIRING_30_DAYS:
        return "hover:bg-muted/30 border-l-4 border-l-amber-300";
      default:
        return "hover:bg-muted/30";
    }
  };

  return (
    <div className="space-y-4">
      {/* Title & Filter Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              {showTitle && (
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">HR Action Center</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Document Expiry Queue & Compliance Action Items
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Urgency Status Quick Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-muted/50 p-1 rounded-lg">
              {[
                { val: "all", label: "All Items" },
                { val: DOCUMENT_STATUSES.EXPIRED, label: "Critical (Expired)" },
                { val: DOCUMENT_STATUSES.EXPIRING_7_DAYS, label: "7 Days" },
                { val: DOCUMENT_STATUSES.EXPIRING_30_DAYS, label: "30 Days" },
                { val: DOCUMENT_STATUSES.EXPIRING_90_DAYS, label: "90 Days" },
              ].map((tab) => (
                <Button
                  key={tab.val}
                  type="button"
                  size="sm"
                  variant={selectedStatus === tab.val ? "default" : "ghost"}
                  className="h-8 text-xs font-medium"
                  onClick={() => setSelectedStatus(tab.val)}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        {/* Detailed Filters Form */}
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee, ID, doc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            {/* Document Type Filter */}
            <div>
              <select
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Document Types</option>
                <option value="PASSPORT">Passport</option>
                <option value="VISA">Visa</option>
                <option value="WORK_PERMIT">Work Permit</option>
                <option value="NATIONAL_ID">National ID</option>
                <option value="OTHER">Other Documents</option>
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Departments</option>
                {departments?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch Filter */}
            <div>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All Branches</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main List */}
      {isLoading ? (
        <div className="flex min-h-[220px] items-center justify-center p-8 bg-card rounded-lg border">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <Card className="border-destructive/30 text-center py-8">
          <p className="text-sm text-destructive font-medium">Failed to load expiring documents</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
            Retry
          </Button>
        </Card>
      ) : !items || items.length === 0 ? (
        <Card className="border-dashed text-center py-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4 text-base font-semibold">No Documents Requiring Attention</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            All document records match valid status or no records matched the selected filter criteria.
          </p>
          {(searchTerm || selectedDocType !== "all" || selectedDept !== "all" || selectedBranch !== "all" || selectedStatus !== "all") && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-xs"
              onClick={() => {
                setSearchTerm("");
                setSelectedStatus("all");
                setSelectedDocType("all");
                setSelectedDept("all");
                setSelectedBranch("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Department / Branch</th>
                  <th className="px-4 py-3">Expiry Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Days Remaining</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => {
                  const cfg = DOCUMENT_STATUS_CONFIG[item.status] || {
                    label: item.status,
                    variant: "secondary" as const,
                  };

                  return (
                    <tr
                      key={`${item.documentType}_${item.documentId}`}
                      className={`transition-colors ${getUrgencyRowClass(item.status)}`}
                    >
                      {/* Employee Column */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{item.employeeName}</div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {item.employeeCode}
                        </div>
                      </td>

                      {/* Document Column */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getDocTypeIcon(item.documentType)}
                          <div>
                            <div className="text-xs font-medium text-foreground">
                              {DOCUMENT_TYPE_LABELS[item.documentType as keyof typeof DOCUMENT_TYPE_LABELS] ||
                                item.documentType}
                            </div>
                            <div className="text-[11px] font-mono text-muted-foreground truncate max-w-[160px]">
                              {item.documentNumber || "—"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department / Branch */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 text-foreground">
                          <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{item.department || "General"}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] mt-0.5">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{item.branch || "Head Office"}</span>
                        </div>
                      </td>

                      {/* Expiry Date */}
                      <td className="px-4 py-3 text-xs font-mono font-medium text-foreground">
                        {item.expiryDate}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3">
                        <Badge variant={cfg.variant} className="text-xs">
                          {cfg.label}
                        </Badge>
                      </td>

                      {/* Days Remaining */}
                      <td className="px-4 py-3 text-xs">
                        {item.daysRemaining < 0 ? (
                          <span className="font-semibold text-destructive">
                            Expired {Math.abs(item.daysRemaining)}d ago
                          </span>
                        ) : item.daysRemaining === 0 ? (
                          <span className="font-semibold text-destructive">Expires Today</span>
                        ) : item.daysRemaining <= 7 ? (
                          <span className="font-semibold text-destructive">
                            {item.daysRemaining} days left
                          </span>
                        ) : (
                          <span className="font-medium text-foreground">
                            {item.daysRemaining} days left
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => {
                            if (onViewEmployee) {
                              onViewEmployee(item.employeeId, mapDocTypeToTab(item.documentType));
                            }
                          }}
                        >
                          <span>Review</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {items.map((item) => {
              const cfg = DOCUMENT_STATUS_CONFIG[item.status] || {
                label: item.status,
                variant: "secondary" as const,
              };

              return (
                <Card
                  key={`${item.documentType}_${item.documentId}`}
                  className={`p-4 space-y-3 ${getUrgencyRowClass(item.status)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {item.employeeName}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {item.employeeCode}
                      </div>
                    </div>
                    <Badge variant={cfg.variant} className="text-xs shrink-0">
                      {cfg.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 border-y py-2 text-xs">
                    {getDocTypeIcon(item.documentType)}
                    <span className="font-medium text-foreground">
                      {DOCUMENT_TYPE_LABELS[item.documentType as keyof typeof DOCUMENT_TYPE_LABELS] ||
                        item.documentType}
                      :
                    </span>
                    <span className="font-mono text-muted-foreground truncate">
                      {item.documentNumber || item.expiryDate}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs">
                      {item.daysRemaining < 0 ? (
                        <span className="font-semibold text-destructive">
                          Expired {Math.abs(item.daysRemaining)}d ago
                        </span>
                      ) : (
                        <span className="font-medium text-foreground">
                          {item.daysRemaining} days left
                        </span>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs"
                      onClick={() => {
                        if (onViewEmployee) {
                          onViewEmployee(item.employeeId, mapDocTypeToTab(item.documentType));
                        }
                      }}
                    >
                      <span>Review</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
