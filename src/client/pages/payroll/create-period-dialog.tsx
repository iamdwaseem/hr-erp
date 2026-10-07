import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X, Loader2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { useCreatePayrollPeriod } from "../../hooks/use-payroll";

const schema = z.object({
  periodYear: z.coerce.number().min(2020).max(2100),
  periodMonth: z.coerce.number().min(1).max(12),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface CreatePeriodDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreatePeriodDialog: React.FC<CreatePeriodDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const createMutation = useCreatePayrollPeriod();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Calculate default start and end of current month
  const defaultStartDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
  const lastDay = new Date(currentYear, currentMonth, 0).getDate();
  const defaultEndDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodYear: currentYear,
      periodMonth: currentMonth,
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      notes: "",
    },
  });

  if (!isOpen) return null;

  const year = watch("periodYear");
  const month = watch("periodMonth");

  const handleMonthYearChange = (newYear: number, newMonth: number) => {
    setValue("periodYear", newYear);
    setValue("periodMonth", newMonth);
    const start = `${newYear}-${String(newMonth).padStart(2, "0")}-01`;
    const last = new Date(newYear, newMonth, 0).getDate();
    const end = `${newYear}-${String(newMonth).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
    setValue("startDate", start);
    setValue("endDate", end);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await createMutation.mutateAsync({
        periodYear: values.periodYear,
        periodMonth: values.periodMonth,
        startDate: values.startDate,
        endDate: values.endDate,
        notes: values.notes || null,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || "Failed to create payroll period");
    }
  };

  const isLoading = createMutation.isPending || isSubmitting;

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Create Payroll Period
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
              <Label htmlFor="periodYear">Year *</Label>
              <Input
                id="periodYear"
                type="number"
                {...register("periodYear", {
                  onChange: (e) => handleMonthYearChange(Number(e.target.value), month),
                })}
              />
              {errors.periodYear && (
                <p className="text-xs text-destructive">{errors.periodYear.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="periodMonth">Month *</Label>
              <Select
                id="periodMonth"
                {...register("periodMonth", {
                  onChange: (e) => handleMonthYearChange(year, Number(e.target.value)),
                })}
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                {...register("startDate")}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                {...register("endDate")}
              />
              {errors.endDate && (
                <p className="text-xs text-destructive">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="e.g. Regular monthly payroll run"
              {...register("notes")}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Period
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
