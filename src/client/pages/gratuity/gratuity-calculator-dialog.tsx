import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { useSaveGratuityRecord } from "../../hooks/use-gratuity";
import type { GratuityCalculationResult } from "../../../shared/utils/payroll-calculations";
import { formatCurrency, toMajorUnits } from "../../../shared/utils/payroll-calculations";

const schema = z.object({
  status: z.enum(["calculated", "finalized", "paid"]).default("finalized"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface GratuityFinalizeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: (GratuityCalculationResult & { employeeId: string; employeeName: string; employeeCode: string }) | null;
}

export const GratuityFinalizeDialog: React.FC<GratuityFinalizeDialogProps> = ({
  isOpen,
  onClose,
  calculation,
}) => {
  const saveMutation = useSaveGratuityRecord();

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: "finalized",
      notes: "",
    },
  });

  if (!isOpen || !calculation) return null;

  const onSubmit = async (values: FormValues) => {
    try {
      await saveMutation.mutateAsync({
        employeeId: calculation.employeeId,
        lastWorkingDate: calculation.lastWorkingDate,
        basicSalaryAtCalculation: toMajorUnits(calculation.basicSalaryAtCalculation),
        serviceYears: calculation.serviceYearsBasisPoints,
        eligibleDays: calculation.eligibleDays,
        gratuityAmount: toMajorUnits(calculation.gratuityAmountFils),
        currency: "AED",
        status: values.status,
        policyVersion: calculation.policyVersion,
        notes: values.notes || null,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to save gratuity settlement record");
    }
  };

  const isLoading = saveMutation.isPending || isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Finalize Gratuity Settlement
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {calculation.employeeName} ({calculation.employeeCode})
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-2 border">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Joining Date:</span>
              <span className="font-medium text-foreground">{calculation.joiningDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Working Date:</span>
              <span className="font-medium text-foreground">{calculation.lastWorkingDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Service Duration:</span>
              <span className="font-medium text-foreground">{calculation.serviceYearsDisplay} ({calculation.serviceDays} days)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Basic Salary Used:</span>
              <span className="font-medium text-foreground">{formatCurrency(calculation.basicSalaryAtCalculation)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Eligible Gratuity Days:</span>
              <span className="font-medium text-foreground">{calculation.eligibleDays} days</span>
            </div>
            <div className="flex justify-between pt-1 border-t text-sm font-semibold">
              <span className="text-foreground">Calculated Settlement:</span>
              <span className="text-primary font-bold">{formatCurrency(calculation.gratuityAmountFils)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">Settlement Status</Label>
            <Select id="status" {...register("status")}>
              <option value="finalized">Finalized (Approved)</option>
              <option value="paid">Paid (Settled)</option>
              <option value="calculated">Draft / Calculated</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Settlement Notes</Label>
            <Input
              id="notes"
              placeholder="e.g. End of contract resignation clearance"
              {...register("notes")}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Gratuity Record
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
