import { z } from "zod";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(val: string): boolean {
  if (!DATE_REGEX.test(val)) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

// ==========================================
// PASSPORT SCHEMAS
// ==========================================

export const passportBaseSchema = z.object({
  passportNumber: z
    .string()
    .trim()
    .min(1, "Passport Number is required")
    .max(50, "Passport Number too long"),
  nationality: z
    .string()
    .trim()
    .min(1, "Nationality is required")
    .max(100, "Nationality too long"),
  issueDate: z
    .string()
    .min(1, "Issue Date is required")
    .refine(isValidDateString, "Issue Date must be a valid date in YYYY-MM-DD format"),
  expiryDate: z
    .string()
    .min(1, "Expiry Date is required")
    .refine(isValidDateString, "Expiry Date must be a valid date in YYYY-MM-DD format"),
  placeOfIssue: z.string().trim().optional().nullable(),
});

export const passportSchema = passportBaseSchema.refine(
  (data) => {
    if (!data.issueDate || !data.expiryDate) return true;
    return new Date(data.expiryDate).getTime() >= new Date(data.issueDate).getTime();
  },
  {
    message: "Expiry date must not be before issue date",
    path: ["expiryDate"],
  }
);

export type PassportInput = z.infer<typeof passportSchema>;

export const updatePassportSchema = passportBaseSchema.partial().refine(
  (data) => {
    if (!data.issueDate || !data.expiryDate) return true;
    return new Date(data.expiryDate).getTime() >= new Date(data.issueDate).getTime();
  },
  {
    message: "Expiry date must not be before issue date",
    path: ["expiryDate"],
  }
);

export type UpdatePassportInput = z.infer<typeof updatePassportSchema>;

// ==========================================
// VISA SCHEMAS
// ==========================================

export const visaBaseSchema = z.object({
  visaNumber: z
    .string()
    .trim()
    .min(1, "Visa Number is required")
    .max(50, "Visa Number too long"),
  visaType: z
    .string()
    .trim()
    .min(1, "Visa Type is required")
    .max(50, "Visa Type too long"),
  issuingState: z.string().trim().optional().nullable(),
  profession: z.string().trim().optional().nullable(),
  issueDate: z
    .string()
    .min(1, "Issue Date is required")
    .refine(isValidDateString, "Issue Date must be a valid date in YYYY-MM-DD format"),
  expiryDate: z
    .string()
    .min(1, "Expiry Date is required")
    .refine(isValidDateString, "Expiry Date must be a valid date in YYYY-MM-DD format"),
  sponsorName: z.string().trim().optional().nullable(),
});

export const visaSchema = visaBaseSchema.refine(
  (data) => {
    if (!data.issueDate || !data.expiryDate) return true;
    return new Date(data.expiryDate).getTime() >= new Date(data.issueDate).getTime();
  },
  {
    message: "Expiry date must not be before issue date",
    path: ["expiryDate"],
  }
);

export type VisaInput = z.infer<typeof visaSchema>;

export const updateVisaSchema = visaBaseSchema.partial().refine(
  (data) => {
    if (!data.issueDate || !data.expiryDate) return true;
    return new Date(data.expiryDate).getTime() >= new Date(data.issueDate).getTime();
  },
  {
    message: "Expiry date must not be before issue date",
    path: ["expiryDate"],
  }
);

export type UpdateVisaInput = z.infer<typeof updateVisaSchema>;

// ==========================================
// WORK PERMIT SCHEMAS
// ==========================================

export const workPermitBaseSchema = z.object({
  permitNumber: z
    .string()
    .trim()
    .min(1, "Work Permit Number is required")
    .max(50, "Work Permit Number too long"),
  profession: z.string().trim().optional().nullable(),
  issueDate: z
    .string()
    .min(1, "Issue Date is required")
    .refine(isValidDateString, "Issue Date must be a valid date in YYYY-MM-DD format"),
  expiryDate: z
    .string()
    .min(1, "Expiry Date is required")
    .refine(isValidDateString, "Expiry Date must be a valid date in YYYY-MM-DD format"),
});

export const workPermitSchema = workPermitBaseSchema.refine(
  (data) => {
    if (!data.issueDate || !data.expiryDate) return true;
    return new Date(data.expiryDate).getTime() >= new Date(data.issueDate).getTime();
  },
  {
    message: "Expiry date must not be before issue date",
    path: ["expiryDate"],
  }
);

export type WorkPermitInput = z.infer<typeof workPermitSchema>;

export const updateWorkPermitSchema = workPermitBaseSchema.partial().refine(
  (data) => {
    if (!data.issueDate || !data.expiryDate) return true;
    return new Date(data.expiryDate).getTime() >= new Date(data.issueDate).getTime();
  },
  {
    message: "Expiry date must not be before issue date",
    path: ["expiryDate"],
  }
);

export type UpdateWorkPermitInput = z.infer<typeof updateWorkPermitSchema>;
