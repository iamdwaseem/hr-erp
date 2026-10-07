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
  useCreateSalaryStructure,
  useUpdateSalaryStructure,
} from "../../hooks/use-salary";
import type { SalaryStructure } from "../../../shared/types/payroll";
import { toMajorUnits } from "../../../shared/utils/payroll-calculations";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z
    .string()
    .min(1, "Code is required")
    .regex(/^[A-Za-z0-9_-]+$/, "Code must contain only letters, numbers, and hyphens"),
  description: z.string().optional(),
  basicSalary: z.coerce.number().min(0, "Basic salary must be >= 0"),
  housingAllowance: z.coerce.number().min(0, "Housing allowance must be >= 0").default(0),
  transportAllowance: z.coerce.number().min(0, "Transport allowance must be >= 0").default(0),
  otherAllowance: z.coerce.number().min(0, "Other allowance must be >= 0").default(0),
  otherDeductions: z.coerce.number().min(0, "Other deductions must be >= 0").default(0),
  currency: z.string().default("AED"),
  status: z.enum(["active", "inactive"]).default("active"),
});

type FormValues = z.infer<typeof schema>;

interface SalaryStructureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  structure?: SalaryStructure | null;
}

export const SalaryStructureDialog: React.FC<SalaryStructureDialogProps> = ({
  isOpen,
  onClose,
  structure,
}) => {
  const isEditing = Boolean(structure);
  const createMutation = useCreateSalaryStructure();
  const updateMutation = useUpdateSalaryStructure();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      basicSalary: 0,
      housingAllowance: 0,
      transportAllowance: 0,
      otherAllowance: 0,
      otherDeductions: 0,
      currency: "AED",
      status: "active",
    },
  });

  useEffect(() => {
    if (structure) {
      reset({
        name: structure.name,
        code: structure.code,
        description: structure.description || "",
        basicSalary: toMajorUnits(structure.basicSalary),
        housingAllowance: toMajorUnits(structure.housingAllowance),
        transportAllowance: toMajorUnits(structure.transportAllowance),
        otherAllowance: toMajorUnits(structure.otherAllowance),
        otherDeductions: toMajorUnits(structure.otherDeductions),
        currency: structure.currency,
        status: structure.status,
      });
    } else {
      reset({
        name: "",
        code: "",
        description: "",
        basicSalary: 0,
        housingAllowance: 0,
        transportAllowance: 0,
        otherAllowance: 0,
        otherDeductions: 0,
        currency: "AED",
        status: "active",
      });
    }
  }, [structure, reset, isOpen]);

  if (!isOpen) return null;

  const basic = watch("basicSalary") || 0;
  const housing = watch("housingAllowance") || 0;
  const transport = watch("transportAllowance") || 0;
  const other = watch("otherAllowance") || 0;
  const deductions = watch("otherDeductions") || 0;
  const gross = Number(basic) + Number(housing) + Number(transport) + Number(other);
  const net = Math.max(0, gross - Number(deductions));

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing && structure) {
        await updateMutation.mutateAsync({
          id: structure.id,
          name: values.name,
          description: values.description || null,
          basicSalary: values.basicSalary,
          housingAllowance: values.housingAllowance,
          transportAllowance: values.transportAllowance,
          otherAllowance: values.otherAllowance,
          otherDeductions: values.otherDeductions,
          currency: values.currency,
          status: values.status,
        });
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          code: values.code,
          description: values.description || null,
          basicSalary: values.basicSalary,
          housingAllowance: values.housingAllowance,
          transportAllowance: values.transportAllowance,
          otherAllowance: values.otherAllowance,
          otherDeductions: values.otherDeductions,
          currency: values.currency,
          status: values.status,
        });
      }
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to save salary structure");
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl border animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? "Edit Salary Structure" : "Create Salary Structure"}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Structure Name *</Label>
              <Input
                id="name"
                placeholder="e.g. Standard Executive Grade 1"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                placeholder="e.g. EXEC-G1"
                disabled={isEditing}
                {...register("code")}
              />
              {errors.code && (
                <p className="text-xs text-destructive">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Structure notes or applicability"
              {...register("description")}
            />
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
              <Label htmlFor="otherDeductions">Standard Deductions (AED)</Label>
              <Input
                id="otherDeductions"
                type="number"
                step="0.01"
                {...register("otherDeductions")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <Select id="status" {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>

          {/* Real-time Calculation Summary */}
          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1 border">
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Gross Salary:</span>
              <span className="text-foreground font-semibold">AED {gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Estimated Net Salary:</span>
              <span className="text-primary font-bold">AED {net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Structure"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
