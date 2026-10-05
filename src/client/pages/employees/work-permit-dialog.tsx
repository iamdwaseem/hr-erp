import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, AlertCircle } from "lucide-react";
import {
  workPermitSchema,
  type WorkPermitInput,
} from "../../../shared/schemas/document";
import type { EmployeeWorkPermit } from "../../../shared/types/document";
import { useCreateWorkPermit, useUpdateWorkPermit } from "../../hooks/use-documents";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/card";

interface WorkPermitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  existingData?: EmployeeWorkPermit | null;
  defaultProfession?: string | null;
}

export const WorkPermitDialog: React.FC<WorkPermitDialogProps> = ({
  isOpen,
  onClose,
  employeeId,
  existingData,
  defaultProfession,
}) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateWorkPermit(employeeId);
  const updateMutation = useUpdateWorkPermit(employeeId);
  const isEditing = Boolean(existingData);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkPermitInput>({
    resolver: zodResolver(workPermitSchema),
    defaultValues: existingData
      ? {
          permitNumber: existingData.permitNumber,
          profession: existingData.profession || "",
          issueDate: existingData.issueDate,
          expiryDate: existingData.expiryDate,
        }
      : {
          permitNumber: "",
          profession: defaultProfession || "",
          issueDate: "",
          expiryDate: "",
        },
  });

  const onSubmit = async (data: WorkPermitInput) => {
    setServerError(null);
    try {
      if (isEditing) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to save work permit details");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-2xl border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle>{isEditing ? "Edit Work Permit" : "Add Work Permit"}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Enter official labor card / work permit registration details
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 pt-4">
            {serverError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="permitNumber">Work Permit / Labor Card Number *</Label>
              <Input
                id="permitNumber"
                placeholder="e.g. WP-987654321"
                {...register("permitNumber")}
              />
              {errors.permitNumber && (
                <p className="text-xs text-destructive">{errors.permitNumber.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profession">Permit Profession</Label>
              <Input
                id="profession"
                placeholder="e.g. Software Engineer"
                {...register("profession")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="issueDate">Issue Date *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  {...register("issueDate")}
                />
                {errors.issueDate && (
                  <p className="text-xs text-destructive">{errors.issueDate.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expiryDate">Expiry Date *</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  {...register("expiryDate")}
                />
                {errors.expiryDate && (
                  <p className="text-xs text-destructive">{errors.expiryDate.message}</p>
                )}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Update Work Permit"
              ) : (
                "Save Work Permit"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
