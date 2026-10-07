import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import {
  useSalaryStructures,
  useAssignEmployeeSalary,
} from "../../hooks/use-salary";
import type { SalaryStructure } from "../../../shared/types/payroll";
import { toMajorUnits } from "../../../shared/utils/payroll-calculations";

const schema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  salaryStructureId: z.string().optional(),
  basicSalary: z.coerce.number().min(0, "Basic salary must be >= 0"),
  housingAllowance: z.coerce.number().min(0, "Housing allowance must be >= 0").default(0),
  transportAllowance: z.coerce.number().min(0, "Transport allowance must be >= 0").default(0),
  otherAllowance: z.coerce.number().min(0, "Other allowance must be >= 0").default(0),
  deductions: z.coerce.number().min(0, "Deductions must be >= 0").default(0),
  currency: z.string().default("AED"),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface AssignSalaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  employeeName?: string;
}

export const AssignSalaryDialog: React.FC<AssignSalaryDialogProps> = ({
  isOpen,
  onClose,
  employeeId,
  employeeName,
}) => {
  const { data: structures = [] } = useSalaryStructures("active");
  const assignMutation = useAssignEmployeeSalary();

  const today = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId,
      salaryStructureId: "",
      basicSalary: 0,
      housingAllowance: 0,
      transportAllowance: 0,
      otherAllowance: 0,
      deductions: 0,
      currency: "AED",
      effectiveFrom: today,
      notes: "",
    },
  });

  useEffect(() => {
    reset({
      employeeId,
      salaryStructureId: "",
      basicSalary: 0,
      housingAllowance: 0,
      transportAllowance: 0,
      otherAllowance: 0,
      deductions: 0,
      currency: "AED",
      effectiveFrom: today,
      notes: "",
    });
  }, [employeeId, reset, isOpen, today]);

  if (!isOpen) return null;

  const selectedStructureId = watch("salaryStructureId");

  const handleStructureChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const structId = e.target.value;
    setValue("salaryStructureId", structId);

    const match = structures.find((s: SalaryStructure) => s.id === structId);
    if (match) {
      setValue("basicSalary", toMajorUnits(match.basicSalary));
      setValue("housingAllowance", toMajorUnits(match.housingAllowance));
      setValue("transportAllowance", toMajorUnits(match.transportAllowance));
      setValue("otherAllowance", toMajorUnits(match.otherAllowance));
      setValue("deductions", toMajorUnits(match.otherDeductions));
    }
  };

  const basic = watch("basicSalary") || 0;
  const housing = watch("housingAllowance") || 0;
  const transport = watch("transportAllowance") || 0;
  const other = watch("otherAllowance") || 0;
  const deductions = watch("deductions") || 0;
  const gross = Number(basic) + Number(housing) + Number(transport) + Number(other);
  const net = Math.max(0, gross - Number(deductions));

  const onSubmit = async (values: FormValues) => {
    try {
      await assignMutation.mutateAsync({
        employeeId: values.employeeId,
        salaryStructureId: values.salaryStructureId || null,
        basicSalary: values.basicSalary,
        housingAllowance: values.housingAllowance,
        transportAllowance: values.transportAllowance,
        otherAllowance: values.otherAllowance,
        deductions: values.deductions,
        currency: values.currency,
        effectiveFrom: values.effectiveFrom,
        notes: values.notes || null,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to assign salary");
    }
  };

  const isLoading = assignMutation.isPending || isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Assign / Update Salary
            </h2>
            {employeeName && (
              <p className="text-xs text-muted-foreground mt-0.5">
                For: <span className="font-medium text-foreground">{employeeName}</span>
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

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="salaryStructureId">Apply Salary Structure (Optional template)</Label>
            <Select
              id="salaryStructureId"
              value={selectedStructureId}
              onChange={handleStructureChange}
            >
              <option value="">Custom / No Structure</option>
              {structures.map((s: SalaryStructure) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) — Basic: AED {toMajorUnits(s.basicSalary).toLocaleString()}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="basicSalary">Basic Salary (AED) *</Label>
              <Input
                id="basicSalary"
                type="number"
                step="0.01"
                {...register("basicSalary")}
              />
              {errors.basicSalary && (
                <p className="text-xs text-destructive">{errors.basicSalary.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="housingAllowance">Housing Allowance (AED)</Label>
              <Input
                id="housingAllowance"
                type="number"
                step="0.01"
                {...register("housingAllowance")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="transportAllowance">Transport Allowance (AED)</Label>
              <Input
                id="transportAllowance"
                type="number"
                step="0.01"
                {...register("transportAllowance")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="otherAllowance">Other Allowance (AED)</Label>
              <Input
                id="otherAllowance"
                type="number"
                step="0.01"
                {...register("otherAllowance")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="deductions">Standard Deductions (AED)</Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                {...register("deductions")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="effectiveFrom">Effective From Date *</Label>
              <Input
                id="effectiveFrom"
                type="date"
                {...register("effectiveFrom")}
              />
              {errors.effectiveFrom && (
                <p className="text-xs text-destructive">{errors.effectiveFrom.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / Reason for change</Label>
            <Input
              id="notes"
              placeholder="e.g. Annual increment or promotion adjustment"
              {...register("notes")}
            />
          </div>

          {/* Real-time Calculation Summary */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1 border">
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Gross Salary:</span>
              <span className="text-foreground font-semibold">AED {gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Net Salary:</span>
              <span className="text-primary font-bold">AED {net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Assigning a new salary automatically closes previous active records and preserves full historical compensation data.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Salary
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
