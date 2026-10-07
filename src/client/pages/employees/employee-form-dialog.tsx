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
import { Combobox } from "../../components/ui/combobox";
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
    setValue,
    watch,
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

          // Local Contact
          localEmail: employeeToEdit.localEmail || employeeToEdit.email || "",
          localMobile: employeeToEdit.localMobile || employeeToEdit.mobile || "",
          localAddressLine1: employeeToEdit.localAddressLine1 || employeeToEdit.addressLine || "",
          localAddressLine2: employeeToEdit.localAddressLine2 || "",
          localCity: employeeToEdit.localCity || employeeToEdit.city || "",
          localState: employeeToEdit.localState || employeeToEdit.state || "",
          localPostalCode: employeeToEdit.localPostalCode || "",
          localCountry: employeeToEdit.localCountry || employeeToEdit.country || "",

          // Home Contact
          homeEmail: employeeToEdit.homeEmail || "",
          homeMobile: employeeToEdit.homeMobile || "",
          homeAlternatePhone: employeeToEdit.homeAlternatePhone || "",
          homeAddressLine1: employeeToEdit.homeAddressLine1 || "",
          homeAddressLine2: employeeToEdit.homeAddressLine2 || "",
          homeCity: employeeToEdit.homeCity || "",
          homeState: employeeToEdit.homeState || "",
          homePostalCode: employeeToEdit.homePostalCode || "",
          homeCountry: employeeToEdit.homeCountry || "",

          // Emergency Contact
          emergencyContactName: employeeToEdit.emergencyContactName || "",
          emergencyContactRelationship: employeeToEdit.emergencyContactRelationship || "",
          emergencyContactMobile: employeeToEdit.emergencyContactMobile || "",
          emergencyContactAlternatePhone: employeeToEdit.emergencyContactAlternatePhone || "",
          emergencyContactEmail: employeeToEdit.emergencyContactEmail || "",
          emergencyContactAddress: employeeToEdit.emergencyContactAddress || "",

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

          localEmail: "",
          localMobile: "",
          localAddressLine1: "",
          localAddressLine2: "",
          localCity: "",
          localState: "",
          localPostalCode: "",
          localCountry: "",

          homeEmail: "",
          homeMobile: "",
          homeAlternatePhone: "",
          homeAddressLine1: "",
          homeAddressLine2: "",
          homeCity: "",
          homeState: "",
          homePostalCode: "",
          homeCountry: "",

          emergencyContactName: "",
          emergencyContactRelationship: "",
          emergencyContactMobile: "",
          emergencyContactAlternatePhone: "",
          emergencyContactEmail: "",
          emergencyContactAddress: "",

          joiningDate: new Date().toISOString().slice(0, 10),
          departmentId: "",
          designationId: "",
          branchId: "",
          employmentStatus: "active",
        },
  });

  const departmentValue = watch("departmentId");
  const designationValue = watch("designationId");
  const branchValue = watch("branchId");

  const departmentOptions = departments.map((d) => ({
    value: d.id,
    label: d.name,
    subLabel: d.code,
  }));

  const designationOptions = designations.map((d) => ({
    value: d.id,
    label: d.name,
    subLabel: d.code,
  }));

  const branchOptions = branches.map((b) => ({
    value: b.id,
    label: b.name,
    subLabel: [b.city, b.country].filter(Boolean).join(", ") || b.code,
  }));

  const mutation = useMutation({
    mutationFn: async (data: CreateEmployeeInput) => {
      const payload: CreateEmployeeInput = {
        ...data,
        profilePhotoUrl: data.profilePhotoUrl?.trim() || null,
        gender: data.gender || null,
        dateOfBirth: data.dateOfBirth || null,
        nationality: data.nationality?.trim() || null,

        // Local Contact
        localEmail: data.localEmail?.trim() || null,
        localMobile: data.localMobile?.trim() || null,
        localAddressLine1: data.localAddressLine1?.trim() || null,
        localAddressLine2: data.localAddressLine2?.trim() || null,
        localCity: data.localCity?.trim() || null,
        localState: data.localState?.trim() || null,
        localPostalCode: data.localPostalCode?.trim() || null,
        localCountry: data.localCountry?.trim() || null,

        // Home Contact
        homeEmail: data.homeEmail?.trim() || null,
        homeMobile: data.homeMobile?.trim() || null,
        homeAlternatePhone: data.homeAlternatePhone?.trim() || null,
        homeAddressLine1: data.homeAddressLine1?.trim() || null,
        homeAddressLine2: data.homeAddressLine2?.trim() || null,
        homeCity: data.homeCity?.trim() || null,
        homeState: data.homeState?.trim() || null,
        homePostalCode: data.homePostalCode?.trim() || null,
        homeCountry: data.homeCountry?.trim() || null,

        // Emergency Contact
        emergencyContactName: data.emergencyContactName?.trim() || null,
        emergencyContactRelationship: data.emergencyContactRelationship?.trim() || null,
        emergencyContactMobile: data.emergencyContactMobile?.trim() || null,
        emergencyContactAlternatePhone: data.emergencyContactAlternatePhone?.trim() || null,
        emergencyContactEmail: data.emergencyContactEmail?.trim() || null,
        emergencyContactAddress: data.emergencyContactAddress?.trim() || null,

        // Legacy compatibility sync
        email: data.localEmail?.trim() || null,
        mobile: data.localMobile?.trim() || null,
        addressLine: data.localAddressLine1?.trim() || null,
        city: data.localCity?.trim() || null,
        state: data.localState?.trim() || null,
        country: data.localCountry?.trim() || null,

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
      <Card className="w-full max-w-3xl my-8 shadow-2xl border bg-card">
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
          <CardContent className="space-y-6 pt-4 max-h-[75vh] overflow-y-auto pr-2">
            {serverError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Section 1: Identification */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
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
                  <p className="text-[11px] text-muted-foreground">Internal business/HR code</p>
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
                  <p className="text-[11px] text-muted-foreground">Official personnel/badge identifier</p>
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
                  {errors.dateOfBirth && (
                    <p className="text-xs text-destructive">{errors.dateOfBirth.message}</p>
                  )}
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

            {/* Section 2: Employment Details */}
            <div className="space-y-3 pt-3 border-t">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
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
                  <Combobox
                    id="departmentId"
                    options={departmentOptions}
                    value={departmentValue}
                    onChange={(val) => setValue("departmentId", val, { shouldValidate: true })}
                    placeholder="Search / select department..."
                    searchPlaceholder="Search department by name or code..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="designationId">Designation</Label>
                  <Combobox
                    id="designationId"
                    options={designationOptions}
                    value={designationValue}
                    onChange={(val) => setValue("designationId", val, { shouldValidate: true })}
                    placeholder="Search / select designation..."
                    searchPlaceholder="Search designation by name or code..."
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="branchId">Branch Location</Label>
                  <Combobox
                    id="branchId"
                    options={branchOptions}
                    value={branchValue}
                    onChange={(val) => setValue("branchId", val, { shouldValidate: true })}
                    placeholder="Search / select branch location..."
                    searchPlaceholder="Search branch by name, city, or country..."
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Local / Work-Country Contact */}
            <div className="space-y-3 pt-3 border-t">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                  3. Local / Work-Country Contact
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Residential and contact details in the work/employment country
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="localEmail">Local Email</Label>
                  <Input
                    id="localEmail"
                    type="email"
                    placeholder="work.email@company.com"
                    {...register("localEmail")}
                  />
                  {errors.localEmail && (
                    <p className="text-xs text-destructive">{errors.localEmail.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="localMobile">Local Mobile Number</Label>
                  <Input
                    id="localMobile"
                    placeholder="+971 50 123 4567"
                    {...register("localMobile")}
                  />
                  {errors.localMobile && (
                    <p className="text-xs text-destructive">{errors.localMobile.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="localAddressLine1">Address Line 1</Label>
                  <Input
                    id="localAddressLine1"
                    placeholder="Building, street, flat number"
                    {...register("localAddressLine1")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="localAddressLine2">Address Line 2 (Optional)</Label>
                  <Input
                    id="localAddressLine2"
                    placeholder="Area, district, landmark"
                    {...register("localAddressLine2")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="localCity">City</Label>
                  <Input id="localCity" placeholder="e.g. Dubai" {...register("localCity")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="localState">State / Emirate / Province</Label>
                  <Input id="localState" placeholder="e.g. Dubai, Abu Dhabi" {...register("localState")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="localPostalCode">Postal Code</Label>
                  <Input id="localPostalCode" placeholder="e.g. 00000" {...register("localPostalCode")} />
                  {errors.localPostalCode && (
                    <p className="text-xs text-destructive">{errors.localPostalCode.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="localCountry">Country</Label>
                  <Input id="localCountry" placeholder="e.g. United Arab Emirates" {...register("localCountry")} />
                </div>
              </div>
            </div>

            {/* Section 4: Home-Country Contact */}
            <div className="space-y-3 pt-3 border-t">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                  4. Home-Country Contact
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Permanent residence and contact details in home country (for expatriates)
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="homeEmail">Home Email</Label>
                  <Input
                    id="homeEmail"
                    type="email"
                    placeholder="personal@gmail.com"
                    {...register("homeEmail")}
                  />
                  {errors.homeEmail && (
                    <p className="text-xs text-destructive">{errors.homeEmail.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="homeMobile">Home Mobile Number</Label>
                  <Input
                    id="homeMobile"
                    placeholder="+91 98765 43210"
                    {...register("homeMobile")}
                  />
                  {errors.homeMobile && (
                    <p className="text-xs text-destructive">{errors.homeMobile.message}</p>
                  )}
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="homeAlternatePhone">Alternate Phone Number</Label>
                  <Input
                    id="homeAlternatePhone"
                    placeholder="+91 11 2345 6789"
                    {...register("homeAlternatePhone")}
                  />
                  {errors.homeAlternatePhone && (
                    <p className="text-xs text-destructive">{errors.homeAlternatePhone.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="homeAddressLine1">Address Line 1</Label>
                  <Input
                    id="homeAddressLine1"
                    placeholder="House, street, neighborhood"
                    {...register("homeAddressLine1")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="homeAddressLine2">Address Line 2 (Optional)</Label>
                  <Input
                    id="homeAddressLine2"
                    placeholder="Village, district, landmark"
                    {...register("homeAddressLine2")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="homeCity">City</Label>
                  <Input id="homeCity" placeholder="e.g. Mumbai, London" {...register("homeCity")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="homeState">State / Province</Label>
                  <Input id="homeState" placeholder="e.g. Maharashtra, Ontario" {...register("homeState")} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="homePostalCode">Postal Code</Label>
                  <Input id="homePostalCode" placeholder="e.g. 400001" {...register("homePostalCode")} />
                  {errors.homePostalCode && (
                    <p className="text-xs text-destructive">{errors.homePostalCode.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="homeCountry">Country</Label>
                  <Input id="homeCountry" placeholder="e.g. India, United Kingdom" {...register("homeCountry")} />
                </div>
              </div>
            </div>

            {/* Section 5: Emergency Contact */}
            <div className="space-y-3 pt-3 border-t">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                  5. Emergency Contact
                </h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Designated contact person in case of medical or urgent workplace emergencies
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactName">Contact Person Name</Label>
                  <Input
                    id="emergencyContactName"
                    placeholder="e.g. Jane Doe"
                    {...register("emergencyContactName")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                  <Input
                    id="emergencyContactRelationship"
                    placeholder="e.g. Spouse, Parent, Sibling"
                    {...register("emergencyContactRelationship")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactMobile">Emergency Mobile *</Label>
                  <Input
                    id="emergencyContactMobile"
                    placeholder="+971 50 999 8888"
                    {...register("emergencyContactMobile")}
                  />
                  {errors.emergencyContactMobile && (
                    <p className="text-xs text-destructive">{errors.emergencyContactMobile.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactAlternatePhone">Alternate Phone</Label>
                  <Input
                    id="emergencyContactAlternatePhone"
                    placeholder="+971 4 123 4567"
                    {...register("emergencyContactAlternatePhone")}
                  />
                  {errors.emergencyContactAlternatePhone && (
                    <p className="text-xs text-destructive">{errors.emergencyContactAlternatePhone.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactEmail">Emergency Email</Label>
                  <Input
                    id="emergencyContactEmail"
                    type="email"
                    placeholder="emergency@example.com"
                    {...register("emergencyContactEmail")}
                  />
                  {errors.emergencyContactEmail && (
                    <p className="text-xs text-destructive">{errors.emergencyContactEmail.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="emergencyContactAddress">Address</Label>
                  <Input
                    id="emergencyContactAddress"
                    placeholder="Residential address of contact"
                    {...register("emergencyContactAddress")}
                  />
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
