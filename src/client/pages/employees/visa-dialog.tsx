import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Loader2, AlertCircle } from "lucide-react";
import {
  visaSchema,
  type VisaInput,
} from "../../../shared/schemas/document";
import type { EmployeeVisa } from "../../../shared/types/document";
import { useCreateVisa, useUpdateVisa } from "../../hooks/use-documents";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/card";

interface VisaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  existingData?: EmployeeVisa | null;
  defaultProfession?: string | null;
}

export const VisaDialog: React.FC<VisaDialogProps> = ({
  isOpen,
  onClose,
  employeeId,
  existingData,
  defaultProfession,
}) => {
  const [serverError, setServerError] = useState<string | null>(null);

  const createMutation = useCreateVisa(employeeId);
  const updateMutation = useUpdateVisa(employeeId);
  const isEditing = Boolean(existingData);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VisaInput>({
    resolver: zodResolver(visaSchema),
    defaultValues: existingData
      ? {
          visaNumber: existingData.visaNumber,
          visaType: existingData.visaType,
          issuingState: existingData.issuingState || "",
          profession: existingData.profession || "",
          issueDate: existingData.issueDate,
          expiryDate: existingData.expiryDate,
          sponsorName: existingData.sponsorName || "",
        }
      : {
          visaNumber: "",
          visaType: "Employment",
          issuingState: "Dubai",
          profession: defaultProfession || "",
          issueDate: "",
          expiryDate: "",
          sponsorName: "",
        },
  });

  const onSubmit = async (data: VisaInput) => {
    setServerError(null);
    try {
      if (isEditing) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
      onClose();
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : "Failed to save visa details");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-2xl border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle>{isEditing ? "Edit Visa Details" : "Add Visa Details"}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Enter residence or work visa numbers and validity schedule
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="visaNumber">Visa / UID Number *</Label>
                <Input
                  id="visaNumber"
                  placeholder="e.g. 201/2024/..."
                  {...register("visaNumber")}
                />
                {errors.visaNumber && (
                  <p className="text-xs text-destructive">{errors.visaNumber.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="visaType">Visa Type *</Label>
                <Select id="visaType" {...register("visaType")}>
                  <option value="Employment">Employment Visa</option>
                  <option value="Residence">Residence Visa</option>
                  <option value="Golden">Golden Visa</option>
                  <option value="Mission">Mission Visa</option>
                  <option value="Visit">Visit / Temporary</option>
                </Select>
                {errors.visaType && (
                  <p className="text-xs text-destructive">{errors.visaType.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="issuingState">Issuing Emirate / State</Label>
                <Input
                  id="issuingState"
                  placeholder="e.g. Dubai, Abu Dhabi"
                  {...register("issuingState")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profession">Profession on Visa</Label>
                <Input
                  id="profession"
                  placeholder="e.g. Software Engineer"
                  {...register("profession")}
                />
              </div>
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
              <Label htmlFor="sponsorName">Sponsor Name</Label>
              <Input
                id="sponsorName"
                placeholder="e.g. Company LLC"
                {...register("sponsorName")}
              />
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
                "Update Visa"
              ) : (
                "Save Visa"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
