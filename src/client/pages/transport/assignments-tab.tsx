import React, { useState } from "react";
import {
  Search,
  PlusCircle,
  Users,
  Route,
  Bus,
  MapPin,
  Calendar,
  StopCircle,
  Edit,
} from "lucide-react";
import {
  useTransportAssignments,
  useTransportRoutes,
} from "../../hooks/use-transport";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import type { TransportAssignment } from "../../../shared/types/transport";

interface AssignmentsTabProps {
  onOpenNewAssignment: () => void;
  onEditAssignment: (assignment: TransportAssignment) => void;
  onEndAssignment: (assignment: TransportAssignment) => void;
  onViewEmployee?: (employeeId: string) => void;
}

export const AssignmentsTab: React.FC<AssignmentsTabProps> = ({
  onOpenNewAssignment,
  onEditAssignment,
  onEndAssignment,
  onViewEmployee,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [routeFilter, setRouteFilter] = useState("");

  const { data: routes = [] } = useTransportRoutes({ all: true });

  const { data: assignments = [], isLoading, error } = useTransportAssignments({
    search: searchInput.trim() || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    routeId: routeFilter || undefined,
  });

  return (
    <div className="space-y-4">
      {/* Search and Filters toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee, route, stop..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-36 text-sm"
          >
            <option value="active">Active Only</option>
            <option value="ended">Ended Only</option>
            <option value="all">All Statuses</option>
          </Select>
          <Select
            value={routeFilter}
            onChange={(e) => setRouteFilter(e.target.value)}
            className="w-44 text-sm"
          >
            <option value="">All Routes</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.code})
              </option>
            ))}
          </Select>
        </div>

        <Button onClick={onOpenNewAssignment}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Assignment
        </Button>
      </div>

      {/* Assignment List Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load transport assignments. Please refresh.
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="font-medium text-foreground">No transport assignments found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {searchInput
                  ? "Try adjusting your search criteria."
                  : "Assign employees to active routes to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Route</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Pickup Point</th>
                    <th className="py-3 px-4">Effective Dates</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assignments.map((a) => {
                    const isActive = a.status === "active";
                    return (
                      <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <button
                                type="button"
                                onClick={() => onViewEmployee && onViewEmployee(a.employeeId)}
                                className="font-semibold text-foreground hover:underline text-left block"
                              >
                                {a.employee?.fullName}
                              </button>
                              <span className="text-xs font-mono text-muted-foreground">
                                {a.employee?.employeeCode}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-foreground flex items-center gap-1">
                            <Route className="h-3.5 w-3.5 text-primary shrink-0" />
                            {a.route?.name}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {a.route?.code}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {a.vehicle ? (
                            <div>
                              <span className="font-semibold text-foreground flex items-center gap-1">
                                <Bus className="h-3.5 w-3.5 text-primary shrink-0" />
                                {a.vehicle.registrationNumber}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                {a.vehicle.vehicleType}
                                {a.vehicle.driverName ? ` (${a.vehicle.driverName})` : ""}
                              </span>
                            </div>
                          ) : (
                            <span className="italic">Flexible / Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {a.pickupPoint ? (
                            <span className="flex items-center gap-1 text-foreground">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              {a.pickupPoint}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span>From {a.effectiveFrom}</span>
                          </div>
                          <span className="text-muted-foreground text-[11px]">
                            {a.effectiveTo ? `To ${a.effectiveTo}` : "Ongoing"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                            {a.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => onEditAssignment(a)}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            {isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => onEndAssignment(a)}
                              >
                                <StopCircle className="h-3.5 w-3.5 mr-1" /> End
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
