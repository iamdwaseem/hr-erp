import React, { useState } from "react";
import {
  Search,
  PlusCircle,
  Bus,
  Edit,
  Power,
  Users,
  Phone,
  User,
} from "lucide-react";
import {
  useTransportVehicles,
  useActivateVehicle,
  useDeactivateVehicle,
} from "../../hooks/use-transport";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import type { TransportVehicle } from "../../../shared/types/transport";

interface VehiclesTabProps {
  onOpenNewVehicle: () => void;
  onEditVehicle: (vehicle: TransportVehicle) => void;
}

export const VehiclesTab: React.FC<VehiclesTabProps> = ({
  onOpenNewVehicle,
  onEditVehicle,
}) => {
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");

  const { data: vehicles = [], isLoading, error } = useTransportVehicles({
    search: searchInput.trim() || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    vehicleType: typeFilter || undefined,
    all: statusFilter === "all",
  });

  const activateVehicle = useActivateVehicle();
  const deactivateVehicle = useDeactivateVehicle();

  const handleToggleStatus = async (vehicle: TransportVehicle) => {
    try {
      if (vehicle.status === "active") {
        await deactivateVehicle.mutateAsync(vehicle.id);
      } else {
        await activateVehicle.mutateAsync(vehicle.id);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to toggle vehicle status");
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by plate, type, or driver..."
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
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-36 text-sm"
          >
            <option value="">All Types</option>
            <option value="Bus">Bus</option>
            <option value="Minibus">Minibus</option>
            <option value="Van">Van</option>
            <option value="Coaster">Coaster</option>
            <option value="Car">Car</option>
          </Select>
        </div>

        <Button onClick={onOpenNewVehicle}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Vehicle
        </Button>
      </div>

      {/* Vehicle List Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-destructive">
              Failed to load vehicles. Please refresh.
            </div>
          ) : vehicles.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Bus className="mx-auto h-8 w-8 text-muted-foreground/60 mb-2" />
              <p className="font-medium text-foreground">No transport vehicles found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {searchInput ? "Try adjusting your search criteria." : "Register a vehicle to manage fleet capacity."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                  <tr>
                    <th className="py-3 px-4">Registration #</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-center">Capacity</th>
                    <th className="py-3 px-4">Driver Name</th>
                    <th className="py-3 px-4">Driver Phone</th>
                    <th className="py-3 px-4 text-center">Active Load</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {vehicles.map((v) => {
                    const isActive = v.status === "active";
                    const isOverCapacity = (v.activeAssignmentsCount ?? 0) > v.capacity;
                    return (
                      <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-foreground flex items-center gap-1.5">
                          <Bus className="h-4 w-4 text-primary shrink-0" />
                          {v.registrationNumber}
                        </td>
                        <td className="py-3 px-4">
                          <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                            {v.vehicleType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-foreground">
                          {v.capacity} seats
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {v.driverName ? (
                            <span className="flex items-center gap-1 text-foreground">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              {v.driverName}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {v.driverPhone ? (
                            <span className="flex items-center gap-1 text-foreground">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {v.driverPhone}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              isOverCapacity
                                ? "bg-destructive/10 text-destructive font-bold"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            <Users className="h-3 w-3" />
                            {v.activeAssignmentsCount ?? 0} / {v.capacity}
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
                              onClick={() => onEditVehicle(v)}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              variant={isActive ? "outline" : "default"}
                              size="sm"
                              className="h-8 px-2 text-xs"
                              onClick={() => handleToggleStatus(v)}
                              disabled={activateVehicle.isPending || deactivateVehicle.isPending}
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
