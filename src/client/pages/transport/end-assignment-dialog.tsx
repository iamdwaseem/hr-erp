import React, { useState, useEffect } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useEndAssignment } from "../../hooks/use-transport";
import type { TransportAssignment } from "../../../shared/types/transport";

interface EndAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: TransportAssignment | null;
}

export const EndAssignmentDialog: React.FC<EndAssignmentDialogProps> = ({
  isOpen,
  onClose,
  assignment,
}) => {
  const endAssignment = useEndAssignment();
  const todayStr = new Date().toISOString().split("T")[0];

  const [effectiveTo, setEffectiveTo] = useState(todayStr);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (assignment) {
      setEffectiveTo(todayStr >= assignment.effectiveFrom ? todayStr : assignment.effectiveFrom);
      setNotes(assignment.notes || "");
    }
    setError(null);
  }, [assignment, isOpen]);

  if (!isOpen || !assignment) return null;

  const isSubmitting = endAssignment.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (effectiveTo < assignment.effectiveFrom) {
      setError(`End date cannot be earlier than start date (${assignment.effectiveFrom})`);
      return;
    }

    try {
      await endAssignment.mutateAsync({
        id: assignment.id,
        data: {
          effectiveTo,
          notes: notes.trim() || undefined,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to end assignment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-semibold text-foreground">End Transport Assignment</h2>
          </div>
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

        <div className="mt-4 rounded-lg bg-muted/50 p-3.5 text-sm space-y-1">
          <p className="font-semibold text-foreground">
            {assignment.employee?.fullName} ({assignment.employee?.employeeCode})
          </p>
          <p className="text-xs text-muted-foreground">
            Route: <span className="font-medium text-foreground">{assignment.route?.name}</span> ({assignment.route?.code})
          </p>
          <p className="text-xs text-muted-foreground">
            Started: <span className="font-medium text-foreground">{assignment.effectiveFrom}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="end-date">Effective End Date *</Label>
            <Input
              id="end-date"
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="end-notes">Closure Reason / Notes</Label>
            <Input
              id="end-notes"
              placeholder="e.g. Employee relocated or switched to personal transit"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              End Assignment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
