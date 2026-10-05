import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, AlertCircle } from "lucide-react";
import {
  createEmployeeSchema,
  type CreateEmployeeInput,
  EMPLOYMENT_STATUSES,
} from "../../../shared/schemas/employee";
import type { Employee } from "../../../shared/types/employee";
import { apiClient } from "../../lib/api-client";
import { useDepartments, useDesignations, useBranches } from "../../hooks/use-masters";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select } from "../../components/ui/select";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../../components/ui/card";

interface EmployeeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeToEdit?: Employee | null;
  onSuccess?: () => void;
}

export const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  isOpen,
  onClose,
  employeeToEdit,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();
  const { data: branches = [] } = useBranches();

  const isEditing = Boolean(employeeToEdit);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: employeeToEdit
      ? {
          employeeCode: employeeToEdit.employeeCode,
          employeeId: employeeToEdit.employeeId,
          fullName: employeeToEdit.fullName,
          profilePhotoUrl: employeeToEdit.profilePhotoUrl || "",
          gender: employeeToEdit.gender || "male",
          dateOfBirth: employeeToEdit.dateOfBirth || "",
          nationality: employeeToEdit.nationality || "",
          mobile: employeeToEdit.mobile || "",
          email: employeeToEdit.email || "",
          addressLine: employeeToEdit.addressLine || "",
          city: employeeToEdit.city || "",
          state: employeeToEdit.state || "",
          country: employeeToEdit.country || "",
          joiningDate: employeeToEdit.joiningDate,
          departmentId: employeeToEdit.departmentId || "",
          designationId: employeeToEdit.designationId || "",
          branchId: employeeToEdit.branchId || "",
          employmentStatus: employeeToEdit.employmentStatus,
        }
      : {
          employeeCode: "",
          employeeId: "",
          fullName: "",
          profilePhotoUrl: "",
          gender: "male",
          dateOfBirth: "",
          nationality: "",
          mobile: "",
          email: "",
          addressLine: "",
          city: "",
          state: "",
          country: "",
          joiningDate: new Date().toISOString().slice(0, 10),
          departmentId: "",
          designationId: "",
          branchId: "",
          employmentStatus: "active",
        },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateEmployeeInput) => {
      // Clean up empty strings for optional fields to null
      const payload = {
        ...data,
        profilePhotoUrl: data.profilePhotoUrl?.trim() || null,
        mobile: data.mobile?.trim() || null,
        email: data.email?.trim() || null,
        gender: data.gender || null,
        dateOfBirth: data.dateOfBirth || null,
        nationality: data.nationality?.trim() || null,
        addressLine: data.addressLine?.trim() || null,
        city: data.city?.trim() || null,
        state: data.state?.trim() || null,
        country: data.country?.trim() || null,
        departmentId: data.departmentId || null,
        designationId: data.designationId || null,
        branchId: data.branchId || null,
      };

      if (isEditing && employeeToEdit) {
        return apiClient.put<Employee>(`/employees/${employeeToEdit.id}`, payload);
      }
      return apiClient.post<Employee>("/employees", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      if (employeeToEdit) {
        queryClient.invalidateQueries({ queryKey: ["employee", employeeToEdit.id] });
      }
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: Error) => {
      setServerError(err.message || "Failed to save employee record");
    },
  });

  const onSubmit = (data: CreateEmployeeInput) => {
    setServerError(null);
    mutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm overflow-y-auto">
      <Card className="w-full max-w-2xl my-8 shadow-2xl border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
          <div>
            <CardTitle>{isEditing ? "Edit Employee" : "Add New Employee"}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {isEditing
                ? `Update master record for ${employeeToEdit?.fullName}`
                : "Fill in the required information to register a new employee record"}
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
          <CardContent className="space-y-6 pt-4 max-h-[70vh] overflow-y-auto pr-2">
            {serverError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Section 1: Identification */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                1. Identification
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="employeeCode">Employee Code *</Label>
                  <Input
                    id="employeeCode"
                    placeholder="e.g. EMP006"
                    {...register("employeeCode")}
                  />
                  {errors.employeeCode && (
                    <p className="text-xs text-destructive">{errors.employeeCode.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="employeeId">Employee ID *</Label>
                  <Input
                    id="employeeId"
                    placeholder="e.g. ID-1006"
                    {...register("employeeId")}
                  />
                  {errors.employeeId && (
                    <p className="text-xs text-destructive">{errors.employeeId.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="e.g. Alexander Hamilton"
                    {...register("fullName")}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-destructive">{errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gender">Gender</Label>
                  <Select id="gender" {...register("gender")}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    {...register("dateOfBirth")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    placeholder="e.g. Emirati, British, Indian"
                    {...register("nationality")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profilePhotoUrl">Photo URL (Optional)</Label>
                  <Input
                    id="profilePhotoUrl"
                    placeholder="https://..."
                    {...register("profilePhotoUrl")}
                  />
                  {errors.profilePhotoUrl && (
                    <p className="text-xs text-destructive">{errors.profilePhotoUrl.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Employment */}
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                2. Employment Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="joiningDate">Joining Date *</Label>
                  <Input
                    id="joiningDate"
                    type="date"
                    {...register("joiningDate")}
                  />
                  {errors.joiningDate && (
                    <p className="text-xs text-destructive">{errors.joiningDate.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="employmentStatus">Employment Status *</Label>
                  <Select id="employmentStatus" {...register("employmentStatus")}>
                    {EMPLOYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.replace("_", " ").toUpperCase()}
                      </option>
                    ))}
                  </Select>
                  {errors.employmentStatus && (
                    <p className="text-xs text-destructive">{errors.employmentStatus.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="departmentId">Department</Label>
                  <Select id="departmentId" {...register("departmentId")}>
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} ({dept.code})
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="designationId">Designation</Label>
                  <Select id="designationId" {...register("designationId")}>
                    <option value="">-- Select Designation --</option>
                    {designations.map((desig) => (
                      <option key={desig.id} value={desig.id}>
                        {desig.name} ({desig.code})
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="branchId">Branch Location</Label>
                  <Select id="branchId" {...register("branchId")}>
                    <option value="">-- Select Branch --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.city ? `${b.city}, ` : ""}{b.country})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 3: Contact */}
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                3. Contact Information
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Official / Personal Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    placeholder="+971501234567"
                    {...register("mobile")}
                  />
                  {errors.mobile && (
                    <p className="text-xs text-destructive">{errors.mobile.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="addressLine">Address Line</Label>
                  <Input
                    id="addressLine"
                    placeholder="e.g. Building 12, Street 4"
                    {...register("addressLine")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="e.g. Dubai" {...register("city")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" placeholder="e.g. United Arab Emirates" {...register("country")} />
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                "Update Employee"
              ) : (
                "Create Employee"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
