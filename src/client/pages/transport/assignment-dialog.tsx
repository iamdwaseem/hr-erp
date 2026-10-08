import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2, Search } from "lucide-react";
import { apiClient } from "../../lib/api-client";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import {
  useTransportRoutes,
  useTransportVehicles,
  useCreateAssignment,
  useUpdateAssignment,
} from "../../hooks/use-transport";
import type { TransportAssignment } from "../../../shared/types/transport";
import type { EmployeeListItem } from "../../../shared/types/employee";

interface AssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentToEdit?: TransportAssignment | null;
  defaultEmployeeId?: string;
}

export const AssignmentDialog: React.FC<AssignmentDialogProps> = ({
  isOpen,
  onClose,
  assignmentToEdit,
  defaultEmployeeId,
}) => {
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();

  // Load routes & vehicles
  const { data: routes = [] } = useTransportRoutes({ status: "active" });
  const { data: vehicles = [] } = useTransportVehicles({ status: "active" });

  // Load employees for assignment selection
  const [employeeSearch, setEmployeeSearch] = useState("");
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<EmployeeListItem[]>({
    queryKey: ["employees", "active-list", employeeSearch],
    queryFn: () =>
      apiClient.get<EmployeeListItem[]>("/employees", {
        params: {
          search: employeeSearch || undefined,
          status: "active",
        },
      }),
    enabled: isOpen,
  });

  const todayStr = new Date().toISOString().split("T")[0];

  const [employeeId, setEmployeeId] = useState("");
  const [routeId, setRouteId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [pickupPoint, setPickupPoint] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [shift, setShift] = useState("GENERAL");
  const [effectiveFrom, setEffectiveFrom] = useState(todayStr);
  const [effectiveTo, setEffectiveTo] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assignmentToEdit) {
      setEmployeeId(assignmentToEdit.employeeId);
      setRouteId(assignmentToEdit.routeId);
      setVehicleId(assignmentToEdit.vehicleId || "");
      setPickupPoint(assignmentToEdit.pickupPoint || "");
      setAccommodation(assignmentToEdit.accommodation || "");
      setShift(assignmentToEdit.shift || "GENERAL");
      setEffectiveFrom(assignmentToEdit.effectiveFrom);
      setEffectiveTo(assignmentToEdit.effectiveTo || "");
      setNotes(assignmentToEdit.notes || "");
    } else {
      setEmployeeId(defaultEmployeeId || "");
      setRouteId(routes[0]?.id || "");
      setVehicleId("");
      setPickupPoint("");
      setAccommodation("");
      setShift("GENERAL");
      setEffectiveFrom(todayStr);
      setEffectiveTo("");
      setNotes("");
    }
    setError(null);
  }, [assignmentToEdit, defaultEmployeeId, isOpen, routes]);

  if (!isOpen) return null;

  const isSubmitting = createAssignment.isPending || updateAssignment.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!employeeId) {
      setError("Please select an employee");
      return;
    }
    if (!routeId) {
      setError("Please select a route");
      return;
    }
    if (!effectiveFrom) {
      setError("Effective From date is required");
      return;
    }
    if (effectiveTo && effectiveTo < effectiveFrom) {
      setError("Effective To date cannot be before Effective From date");
      return;
    }

    try {
      if (assignmentToEdit) {
        await updateAssignment.mutateAsync({
          id: assignmentToEdit.id,
          data: {
            routeId,
            vehicleId: vehicleId || null,
            pickupPoint: pickupPoint.trim() || null,
            accommodation: accommodation.trim() || null,
            shift,
            effectiveFrom,
            effectiveTo: effectiveTo || null,
            notes: notes.trim() || null,
          },
        });
      } else {
        await createAssignment.mutateAsync({
          employeeId,
          routeId,
          vehicleId: vehicleId || null,
          pickupPoint: pickupPoint.trim() || null,
          accommodation: accommodation.trim() || null,
          shift,
          effectiveFrom,
          effectiveTo: effectiveTo || null,
          notes: notes.trim() || null,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save assignment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b">
          <h2 className="text-lg font-semibold text-foreground">
            {assignmentToEdit ? "Edit Transport Assignment" : "Assign Transport to Employee"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Employee Selection */}
          {!assignmentToEdit ? (
            <div className="space-y-1.5">
              <Label htmlFor="emp-select">Select Employee *</Label>
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter employees by name or code..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>
              <Select
                id="emp-select"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              >
                <option value="">-- Choose Employee --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode})
                  </option>
                ))}
              </Select>
              {isLoadingEmployees && (
                <p className="text-xs text-muted-foreground">Loading active employees...</p>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <span className="text-xs text-muted-foreground uppercase font-medium">Employee</span>
              <p className="font-semibold text-foreground mt-0.5">
                {assignmentToEdit.employee?.fullName} ({assignmentToEdit.employee?.employeeCode})
              </p>
            </div>
          )}

          {/* Route Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="route-select">Transport Route *</Label>
            <Select
              id="route-select"
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              required
            >
              <option value="">-- Choose Route --</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </Select>
            {routes.length === 0 && (
              <p className="text-xs text-amber-600">
                No active routes found. Please create or activate a route first.
              </p>
            )}
          </div>

          {/* Vehicle Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="vehicle-select">Assigned Vehicle (Optional)</Label>
            <Select
              id="vehicle-select"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">No Vehicle Assigned / Flexible</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registrationNumber} — {v.vehicleType} (Cap: {v.capacity})
                  {v.driverName ? ` — ${v.driverName}` : ""}
                </option>
              ))}
            </Select>
          </div>

          {/* Pickup Point */}
          <div className="space-y-1.5">
            <Label htmlFor="pickup-pt">Pickup Point / Stop</Label>
            <Input
              id="pickup-pt"
              placeholder="e.g. Al Barsha Metro Exit 2"
              value={pickupPoint}
              onChange={(e) => setPickupPoint(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="accommodation">Labour Accommodation / Camp</Label>
              <Input
                id="accommodation"
                placeholder="e.g. Sonapur Camp 4"
                value={accommodation}
                onChange={(e) => setAccommodation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shift">Work Shift</Label>
              <Select id="shift" value={shift} onChange={(e) => setShift(e.target.value)}>
                <option value="GENERAL">General</option>
                <option value="DAY">Day Shift</option>
                <option value="NIGHT">Night Shift</option>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="eff-from">Effective From *</Label>
              <Input
                id="eff-from"
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="eff-to">Effective To (Optional)</Label>
              <Input
                id="eff-to"
                type="date"
                value={effectiveTo}
                onChange={(e) => setEffectiveTo(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Leave blank for ongoing assignment</p>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="assign-notes">Notes (Optional)</Label>
            <Input
              id="assign-notes"
              placeholder="Special instructions or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || routes.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {assignmentToEdit ? "Save Changes" : "Create Assignment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
