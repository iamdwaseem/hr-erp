import React, { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { useBranches } from "../../hooks/use-masters";
import { useCreateRoute, useUpdateRoute } from "../../hooks/use-transport";
import type { TransportRoute } from "../../../shared/types/transport";

interface RouteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  routeToEdit?: TransportRoute | null;
}

export const RouteDialog: React.FC<RouteDialogProps> = ({
  isOpen,
  onClose,
  routeToEdit,
}) => {
  const { data: branches = [] } = useBranches();
  const createRoute = useCreateRoute();
  const updateRoute = useUpdateRoute();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [pickupPoints, setPickupPoints] = useState("");
  const [destinationBranchId, setDestinationBranchId] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (routeToEdit) {
      setName(routeToEdit.name);
      setCode(routeToEdit.code);
      setDescription(routeToEdit.description || "");
      setPickupPoints(routeToEdit.pickupPoints || "");
      setDestinationBranchId(routeToEdit.destinationBranchId || "");
      setStatus(routeToEdit.status);
    } else {
      setName("");
      setCode("");
      setDescription("");
      setPickupPoints("");
      setDestinationBranchId("");
      setStatus("active");
    }
    setError(null);
  }, [routeToEdit, isOpen]);

  if (!isOpen) return null;

  const isSubmitting = createRoute.isPending || updateRoute.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Route name is required");
      return;
    }
    if (!code.trim()) {
      setError("Route code is required");
      return;
    }

    try {
      if (routeToEdit) {
        await updateRoute.mutateAsync({
          id: routeToEdit.id,
          data: {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim() || null,
            pickupPoints: pickupPoints.trim() || null,
            destinationBranchId: destinationBranchId || null,
            status,
          },
        });
      } else {
        await createRoute.mutateAsync({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || null,
          pickupPoints: pickupPoints.trim() || null,
          destinationBranchId: destinationBranchId || null,
          status,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save route");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b">
          <h2 className="text-lg font-semibold text-foreground">
            {routeToEdit ? "Edit Route" : "Add Transport Route"}
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
              <Label htmlFor="route-name">Route Name *</Label>
              <Input
                id="route-name"
                placeholder="e.g. Route A - Deira to HQ"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="route-code">Route Code *</Label>
              <Input
                id="route-code"
                placeholder="e.g. RT-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="destination-branch">Destination Branch</Label>
              <Select
                id="destination-branch"
                value={destinationBranchId}
                onChange={(e) => setDestinationBranchId(e.target.value)}
              >
                <option value="">None / General</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="route-status">Status</Label>
              <Select
                id="route-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pickup-points">Pickup Points / Stops</Label>
            <Input
              id="pickup-points"
              placeholder="e.g. Al Barsha Metro, Business Bay, DIFC Gate"
              value={pickupPoints}
              onChange={(e) => setPickupPoints(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of scheduled pickup stops along this route.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="route-desc">Description (Optional)</Label>
            <Input
              id="route-desc"
              placeholder="Additional route operational details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {routeToEdit ? "Save Changes" : "Create Route"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
