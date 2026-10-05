import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, AlertCircle } from "lucide-react";
import {
  passportSchema,
  type PassportInput,
} from "../../../shared/schemas/document";
import type { EmployeePassport } from "../../../shared/types/document";
import { useCreatePassport, useUpdatePassport } from "../../hooks/use-documents";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/card";

interface PassportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  existingData?: EmployeePassport | null;
  defaultNationality?: string | null;
}

export const PassportDialog: React.FC<PassportDialogProps> = ({
  isOpen,
  onClose,
  employeeId,
  existingData,
  defaultNationality,
}) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreatePassport(employeeId);
  const updateMutation = useUpdatePassport(employeeId);
  const isEditing = Boolean(existingData);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PassportInput>({
    resolver: zodResolver(passportSchema),
    defaultValues: existingData
      ? {
          passportNumber: existingData.passportNumber,
          nationality: existingData.nationality,
          issueDate: existingData.issueDate,
          expiryDate: existingData.expiryDate,
          placeOfIssue: existingData.placeOfIssue || "",
        }
      : {
          passportNumber: "",
          nationality: defaultNationality || "",
          issueDate: "",
          expiryDate: "",
          placeOfIssue: "",
        },
  });

  const onSubmit = async (data: PassportInput) => {
    setServerError(null);
    try {
      if (isEditing) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to save passport details");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-2xl border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle>{isEditing ? "Edit Passport Details" : "Add Passport Details"}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Enter official passport identification and validity dates
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
              <Label htmlFor="passportNumber">Passport Number *</Label>
              <Input
                id="passportNumber"
                placeholder="e.g. A12345678"
                {...register("passportNumber")}
              />
              {errors.passportNumber && (
                <p className="text-xs text-destructive">{errors.passportNumber.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nationality">Nationality / Issuing Country *</Label>
              <Input
                id="nationality"
                placeholder="e.g. United Arab Emirates"
                {...register("nationality")}
              />
              {errors.nationality && (
                <p className="text-xs text-destructive">{errors.nationality.message}</p>
              )}
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

            <div className="space-y-1.5">
              <Label htmlFor="placeOfIssue">Place of Issue (Optional)</Label>
              <Input
                id="placeOfIssue"
                placeholder="e.g. Dubai"
                {...register("placeOfIssue")}
              />
              {errors.placeOfIssue && (
                <p className="text-xs text-destructive">{errors.placeOfIssue.message}</p>
              )}
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
                "Update Passport"
              ) : (
                "Save Passport"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
