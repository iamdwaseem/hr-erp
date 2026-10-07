import React, { useState } from "react";
import {
  Search,
  PlusCircle,
  Route,
  Edit,
  Power,
  MapPin,
  Building,
  Users,
} from "lucide-react";
import {
  useTransportRoutes,
  useActivateRoute,
  useDeactivateRoute,
} from "../../hooks/use-transport";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import type { TransportRoute } from "../../../shared/types/transport";

interface RoutesTabProps {
  onOpenNewRoute: () => void;
  onEditRoute: (route: TransportRoute) => void;
}

export const RoutesTab: React.FC<RoutesTabProps> = ({
  onOpenNewRoute,
  onEditRoute,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: routes = [], isLoading, error } = useTransportRoutes({
    search: searchInput.trim() || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    all: statusFilter === "all",
  });

  const activateRoute = useActivateRoute();
  const deactivateRoute = useDeactivateRoute();

  const handleToggleStatus = async (route: TransportRoute) => {
    try {
      if (route.status === "active") {
        await deactivateRoute.mutateAsync(route.id);
      } else {
        await activateRoute.mutateAsync(route.id);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to toggle route status");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or stop..."
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
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </Select>
        </div>

        <Button onClick={onOpenNewRoute}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Route
        </Button>
      </div>

      {/* Routes List Table / Cards */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load routes. Please refresh.
            </div>
          ) : routes.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Route className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="font-medium text-foreground">No transport routes found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {searchInput ? "Try adjusting your search filters." : "Create your first route to get started."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="py-3 px-4">Route Info</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Destination Branch</th>
                    <th className="py-3 px-4">Pickup Stops</th>
                    <th className="py-3 px-4 text-center">Active Passengers</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {routes.map((r) => {
                    const isActive = r.status === "active";
                    return (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <Route className="h-4 w-4 text-primary shrink-0" />
                            {r.name}
                          </div>
                          {r.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                              {r.description}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-foreground">
                          {r.code}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {r.destinationBranch ? (
                            <span className="flex items-center gap-1 text-foreground">
                              <Building className="h-3.5 w-3.5 text-muted-foreground" />
                              {r.destinationBranch.name}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground max-w-xs">
                          {r.pickupPoints ? (
                            <span className="flex items-center gap-1 truncate" title={r.pickupPoints}>
                              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate">{r.pickupPoints}</span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            <Users className="h-3 w-3" />
                            {r.activeAssignmentsCount ?? 0}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
                            {isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => onEditRoute(r)}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              variant={isActive ? "outline" : "default"}
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => handleToggleStatus(r)}
                              disabled={activateRoute.isPending || deactivateRoute.isPending}
                            >
                              <Power className="h-3.5 w-3.5 mr-1" />
                              {isActive ? "Deactivate" : "Activate"}
                            </Button>
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
