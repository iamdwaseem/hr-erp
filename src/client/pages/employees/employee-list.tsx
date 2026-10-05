import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  UserPlus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Loader2,
  Users,
  AlertCircle,
  Building,
  Briefcase,
  MapPin,
} from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { useAuth } from "../../hooks/use-auth";
import { ROLES } from "../../../shared/constants/roles";
import type { EmployeeListItem } from "../../../shared/types/employee";
import { EMPLOYMENT_STATUSES } from "../../../shared/schemas/employee";
import { useDepartments, useDesignations, useBranches } from "../../hooks/use-masters";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { EmployeeFormDialog } from "./employee-form-dialog";

interface EmployeeListProps {
  onSelectEmployee: (id: string) => void;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({ onSelectEmployee }) => {
  const { hasRole } = useAuth();
  const canCreateOrEdit = hasRole([ROLES.ADMIN, ROLES.HR]);

  // Filters state
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [designationId, setDesignationId] = useState<string>("");
  const [branchId, setBranchId] = useState<string>("");
  const [employmentStatus, setEmploymentStatus] = useState<string>("");
  const [nationality, setNationality] = useState<string>("");

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<any | null>(null);

  // Load masters for filter dropdowns
  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();
  const { data: branches = [] } = useBranches();

  // Fetch employees
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<EmployeeListItem[]>({
    queryKey: [
      "employees",
      { page, limit, search, departmentId, designationId, branchId, employmentStatus, nationality },
    ],
    queryFn: async () => {
      // apiClient.get returns data directly or throws
      const res = await apiClient.get<EmployeeListItem[]>("/employees", {
        params: {
          page,
          limit,
          search: search || undefined,
          departmentId: departmentId || undefined,
          designationId: designationId || undefined,
          branchId: branchId || undefined,
          employmentStatus: employmentStatus || undefined,
          nationality: nationality || undefined,
        },
      });
      return res;
    },
  });

  const employees = data || [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSearchInput("");
    setDepartmentId("");
    setDesignationId("");
    setBranchId("");
    setEmploymentStatus("");
    setNationality("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search || departmentId || designationId || branchId || employmentStatus || nationality
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "probation":
        return <Badge variant="warning">Probation</Badge>;
      case "terminated":
        return <Badge variant="destructive">Terminated</Badge>;
      case "resigned":
        return <Badge variant="destructive">Resigned</Badge>;
      case "on_leave":
        return <Badge variant="secondary">On Leave</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Employee Master</h2>
          <p className="text-sm text-muted-foreground">
            Manage organization workforce, profiles, and employment credentials.
          </p>
        </div>

        {canCreateOrEdit && (
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 shrink-0">
            <UserPlus className="h-4 w-4" />
            <span>Add Employee</span>
          </Button>
        )}
      </div>

      {/* Search and Filters Section */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Employee ID, Code, or Name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary" className="gap-1.5">
              <span>Search</span>
            </Button>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetFilters}
                className="gap-1 text-muted-foreground hover:text-foreground"
                title="Reset all filters"
              >
                <X className="h-4 w-4" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            )}
          </form>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t">
            {/* Department */}
            <div>
              <Select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Designation */}
            <div>
              <Select
                value={designationId}
                onChange={(e) => {
                  setDesignationId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Designations</option>
                {designations.map((desig) => (
                  <option key={desig.id} value={desig.id}>
                    {desig.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Branch */}
            <div>
              <Select
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Locations</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>

            {/* Employment Status */}
            <div>
              <Select
                value={employmentStatus}
                onChange={(e) => {
                  setEmploymentStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                {EMPLOYMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ").toUpperCase()}
                  </option>
                ))}
              </Select>
            </div>

            {/* Nationality */}
            <div>
              <Input
                placeholder="Filter Nationality..."
                value={nationality}
                onChange={(e) => {
                  setNationality(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Employee Table / Mobile Card List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex min-h-[300px] items-center justify-center p-8">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading employee directory...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="flex min-h-[300px] items-center justify-center p-8">
              <div className="flex flex-col items-center gap-3 text-center max-w-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-foreground">Failed to load employees</h4>
                <p className="text-xs text-muted-foreground">
                  {error instanceof Error ? error.message : "An error occurred fetching the employee directory."}
                </p>
                <Button size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            </div>
          ) : employees.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center p-8">
              <div className="flex flex-col items-center gap-3 text-center max-w-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Users className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-foreground">No employees found</h4>
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilters
                    ? "Try adjusting or clearing your search filters to find records."
                    : "Get started by adding your first employee to the directory."}
                </p>
                {hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={handleResetFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  canCreateOrEdit && (
                    <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                      Add Employee
                    </Button>
                  )
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Code / ID</th>
                      <th className="px-4 py-3">Full Name</th>
                      <th className="px-4 py-3">Nationality</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Designation</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Joining Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {employees.map((emp) => (
                      <tr
                        key={emp.id}
                        onClick={() => onSelectEmployee(emp.id)}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-mono text-xs font-medium text-foreground">
                            {emp.employeeCode}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {emp.employeeId}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                              {emp.profilePhotoUrl ? (
                                <img
                                  src={emp.profilePhotoUrl}
                                  alt={emp.fullName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                emp.fullName.slice(0, 2).toUpperCase()
                              )}
                            </div>
                            <span className="font-medium text-foreground truncate max-w-[160px]">
                              {emp.fullName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {emp.nationality || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {emp.departmentName || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {emp.designationName || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {emp.branchName || "—"}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                          {emp.joiningDate}
                        </td>
                        <td className="px-4 py-3.5">
                          {getStatusBadge(emp.employmentStatus)}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onSelectEmployee(emp.id)}
                            title="View Profile"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canCreateOrEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                apiClient.get(`/employees/${emp.id}`).then((full) => {
                                  setEmployeeToEdit(full);
                                });
                              }}
                              title="Edit Employee"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-border">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => onSelectEmployee(emp.id)}
                    className="p-4 space-y-3 cursor-pointer hover:bg-muted/40 active:bg-muted"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {emp.profilePhotoUrl ? (
                            <img
                              src={emp.profilePhotoUrl}
                              alt={emp.fullName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            emp.fullName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-foreground">
                            {emp.fullName}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {emp.employeeCode} • {emp.employeeId}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(emp.employmentStatus)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <Building className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{emp.departmentName || "Unassigned"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Briefcase className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{emp.designationName || "Unassigned"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{emp.branchName || "Unassigned"}</span>
                      </div>
                      <div className="truncate">
                        <span>Joined: {emp.joiningDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t p-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded border bg-background px-2 py-1"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="ml-2">
                    Showing {employees.length} employee{employees.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <span className="px-2 font-medium text-foreground">Page {page}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={employees.length < limit}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <EmployeeFormDialog
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Edit Employee Modal */}
      {employeeToEdit && (
        <EmployeeFormDialog
          isOpen={Boolean(employeeToEdit)}
          onClose={() => setEmployeeToEdit(null)}
          employeeToEdit={employeeToEdit}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
};
