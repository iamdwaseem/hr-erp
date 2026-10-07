import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { useCreateVehicle, useUpdateVehicle } from "../../hooks/use-transport";
import type { TransportVehicle } from "../../../shared/types/transport";

interface VehicleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleToEdit?: TransportVehicle | null;
}

const VEHICLE_TYPES = ["Bus", "Minibus", "Van", "Coaster", "Car", "SUV", "Other"];

export const VehicleDialog: React.FC<VehicleDialogProps> = ({
  isOpen,
  onClose,
  vehicleToEdit,
}) => {
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();

  const [registrationNumber, setRegistrationNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("Bus");
  const [capacity, setCapacity] = useState("30");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicleToEdit) {
      setRegistrationNumber(vehicleToEdit.registrationNumber);
      setVehicleType(vehicleToEdit.vehicleType);
      setCapacity(String(vehicleToEdit.capacity));
      setDriverName(vehicleToEdit.driverName || "");
      setDriverPhone(vehicleToEdit.driverPhone || "");
      setStatus(vehicleToEdit.status);
    } else {
      setRegistrationNumber("");
      setVehicleType("Bus");
      setCapacity("30");
      setDriverName("");
      setDriverPhone("");
      setStatus("active");
    }
    setError(null);
  }, [vehicleToEdit, isOpen]);

  if (!isOpen) return null;

  const isSubmitting = createVehicle.isPending || updateVehicle.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!registrationNumber.trim()) {
      setError("Registration number is required");
      return;
    }

    const capNum = parseInt(capacity, 10);
    if (isNaN(capNum) || capNum <= 0) {
      setError("Capacity must be a positive number greater than 0");
      return;
    }

    try {
      if (vehicleToEdit) {
        await updateVehicle.mutateAsync({
          id: vehicleToEdit.id,
          data: {
            registrationNumber: registrationNumber.trim().toUpperCase(),
            vehicleType,
            capacity: capNum,
            driverName: driverName.trim() || null,
            driverPhone: driverPhone.trim() || null,
            status,
          },
        });
      } else {
        await createVehicle.mutateAsync({
          registrationNumber: registrationNumber.trim().toUpperCase(),
          vehicleType,
          capacity: capNum,
          driverName: driverName.trim() || null,
          driverPhone: driverPhone.trim() || null,
          status,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save vehicle");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b">
          <h2 className="text-lg font-semibold text-foreground">
            {vehicleToEdit ? "Edit Vehicle" : "Add Transport Vehicle"}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg-num">Plate / Registration # *</Label>
              <Input
                id="reg-num"
                placeholder="e.g. DXB-A-12345"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="veh-type">Vehicle Type *</Label>
              <Select
                id="veh-type"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="veh-capacity">Passenger Capacity *</Label>
              <Input
                id="veh-capacity"
                type="number"
                min="1"
                placeholder="e.g. 30"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="veh-status">Status</Label>
              <Select
                id="veh-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="driver-name">Driver Name</Label>
              <Input
                id="driver-name"
                placeholder="e.g. Mohammed Ali"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driver-phone">Driver Phone</Label>
              <Input
                id="driver-phone"
                placeholder="e.g. +971 50 123 4567"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {vehicleToEdit ? "Save Changes" : "Create Vehicle"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
