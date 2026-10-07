import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Plus, Trash2, Loader2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import {
  usePayrollRecord,
  useAddPayrollAdjustment,
  useDeletePayrollAdjustment,
} from "../../hooks/use-payroll";
import type { PayrollAdjustment } from "../../../shared/types/payroll";
import { formatCurrency, toMajorUnits } from "../../../shared/utils/payroll-calculations";

const schema = z.object({
  type: z.enum(["EARNING", "DEDUCTION"]),
  name: z.string().min(1, "Name is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface PayrollAdjustmentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recordId: string;
  isLocked?: boolean;
}

export const PayrollAdjustmentsDialog: React.FC<PayrollAdjustmentsDialogProps> = ({
  isOpen,
  onClose,
  recordId,
  isLocked = false,
}) => {
  const { data: record, isLoading: isRecordLoading } = usePayrollRecord(recordId);
  const addMutation = useAddPayrollAdjustment();
  const deleteMutation = useDeletePayrollAdjustment();
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "EARNING",
      name: "",
      amount: 0,
      reason: "",
    },
  });

  if (!isOpen) return null;

  const onAddSubmit = async (values: FormValues) => {
    try {
      await addMutation.mutateAsync({
        recordId,
        type: values.type,
        name: values.name,
        amount: values.amount,
        reason: values.reason || null,
      });
      reset();
      setShowAddForm(false);
    } catch (err: any) {
      alert(err.message || "Failed to add adjustment");
    }
  };

  const handleDeleteAdjustment = async (adjId: string) => {
    if (isLocked) return;
    try {
      await deleteMutation.mutateAsync(adjId);
    } catch (err: any) {
      alert(err.message || "Failed to delete adjustment");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-xl bg-card p-6 shadow-xl border animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Payroll Record & Adjustments
            </h2>
            {record && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {record.employeeName} ({record.employeeCode}) — {record.departmentName || "No Dept"}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isRecordLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : record ? (
          <div className="mt-4 space-y-4">
            {/* Snapshot Compensation Summary */}
            <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-xs border">
              <div>
                <span className="text-muted-foreground block">Basic Salary:</span>
                <span className="font-semibold text-foreground">{formatCurrency(record.basicSalary)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Gross Earnings:</span>
                <span className="font-semibold text-foreground">{formatCurrency(record.grossEarnings)}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Net Payable:</span>
                <span className="font-bold text-primary">{formatCurrency(record.netSalary)}</span>
              </div>
            </div>

            {/* Adjustments List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Itemized Adjustments ({record.adjustments?.length || 0})
                </h3>
                {!isLocked && !showAddForm && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddForm(true)}
                    className="h-8 gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Adjustment
                  </Button>
                )}
              </div>

              {showAddForm && (
                <form
                  onSubmit={handleSubmit(onAddSubmit)}
                  className="rounded-lg border bg-muted/30 p-3 space-y-3 animate-in fade-in duration-100"
                >
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select className="h-8 text-xs" {...register("type")}>
                        <option value="EARNING">Earning (+)</option>
                        <option value="DEDUCTION">Deduction (-)</option>
                      </Select>
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label className="text-xs">Adjustment Name *</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="e.g. Overtime or Cash Advance"
                        {...register("name")}
                      />
                      {errors.name && (
                        <p className="text-[10px] text-destructive">{errors.name.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Amount (AED) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs"
                        {...register("amount")}
                      />
                      {errors.amount && (
                        <p className="text-[10px] text-destructive">{errors.amount.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Reason / Note</Label>
                      <Input
                        className="h-8 text-xs"
                        placeholder="Reason for adjustment"
                        {...register("reason")}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setShowAddForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={isSubmitting || addMutation.isPending}
                    >
                      {addMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Save Adjustment
                    </Button>
                  </div>
                </form>
              )}

              {record.adjustments && record.adjustments.length > 0 ? (
                <div className="divide-y rounded-lg border bg-card">
                  {record.adjustments.map((adj: PayrollAdjustment) => (
                    <div
                      key={adj.id}
                      className="flex items-center justify-between p-2.5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {adj.type === "EARNING" ? (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
                            <ArrowDownRight className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">{adj.name}</p>
                          {adj.reason && (
                            <p className="text-[11px] text-muted-foreground">{adj.reason}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`font-semibold ${
                            adj.type === "EARNING"
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {adj.type === "EARNING" ? "+" : "-"} AED {toMajorUnits(adj.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {!isLocked && (
                          <button
                            onClick={() => handleDeleteAdjustment(adj.id)}
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Delete adjustment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-4 text-center text-xs text-muted-foreground border rounded-lg">
                  No adjustments added to this payroll record.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
