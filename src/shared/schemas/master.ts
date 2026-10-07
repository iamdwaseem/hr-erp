import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Department name must be at least 2 characters").max(100),
  code: z.string().trim().min(2, "Department code must be at least 2 characters").max(20),
});

export const updateDepartmentSchema = departmentSchema.partial();

export const designationSchema = z.object({
  name: z.string().trim().min(2, "Designation name must be at least 2 characters").max(100),
  code: z.string().trim().min(2, "Designation code must be at least 2 characters").max(20),
});

export const updateDesignationSchema = designationSchema.partial();

export const branchSchema = z.object({
  name: z.string().trim().min(2, "Branch name must be at least 2 characters").max(100),
  code: z.string().trim().min(2, "Branch code must be at least 2 characters").max(20),
  city: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
});

export const updateBranchSchema = branchSchema.partial();

export const documentTypeMasterSchema = z.object({
  name: z.string().trim().min(2, "Document type name must be at least 2 characters").max(100),
  code: z.string().trim().min(2, "Document type code must be at least 2 characters").max(50),
  description: z.string().trim().optional().nullable(),
});

export const updateDocumentTypeMasterSchema = documentTypeMasterSchema.partial();
