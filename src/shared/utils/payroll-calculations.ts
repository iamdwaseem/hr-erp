/**
 * Authoritative financial calculations and currency formatting for Salary & Payroll.
 * All monetary values stored and processed in minor currency units (fils/cents, 1 AED = 100 fils).
 */

/**
 * Convert major units (e.g., AED 5000.50) to minor units (fils: 500050).
 */
export function toMinorUnits(amount: number | string | null | undefined): number {
  if (amount === null || amount === undefined || amount === "") return 0;
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Convert minor units (fils: 500050) to major units (e.g., 5000.5).
 */
export function toMajorUnits(fils: number | null | undefined): number {
  if (fils === null || fils === undefined || isNaN(fils)) return 0;
  return fils / 100;
}

/**
 * Format minor units into human-readable currency string (e.g., "AED 5,000.00").
 */
export function formatCurrency(
  fils: number | null | undefined,
  currency = "AED",
  includeSymbol = true
): string {
  const major = toMajorUnits(fils);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(major);

  return includeSymbol ? `${currency} ${formatted}` : formatted;
}

export interface SalaryBreakdown {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
}

/**
 * Calculate Gross and Net salary authoritatively in minor units (fils).
 */
export function calculateSalaryTotals(inputs: {
  basicSalary: number;
  housingAllowance?: number;
  transportAllowance?: number;
  otherAllowance?: number;
  deductions?: number;
  additionalEarnings?: number;
  additionalDeductions?: number;
}): {
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
} {
  const basic = Math.max(0, Math.round(inputs.basicSalary || 0));
  const housing = Math.max(0, Math.round(inputs.housingAllowance || 0));
  const transport = Math.max(0, Math.round(inputs.transportAllowance || 0));
  const other = Math.max(0, Math.round(inputs.otherAllowance || 0));
  const addEarnings = Math.max(0, Math.round(inputs.additionalEarnings || 0));

  const baseDeductions = Math.max(0, Math.round(inputs.deductions || 0));
  const addDeductions = Math.max(0, Math.round(inputs.additionalDeductions || 0));

  const grossSalary = basic + housing + transport + other + addEarnings;
  const totalDeductions = baseDeductions + addDeductions;
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  return {
    basicSalary: basic,
    housingAllowance: housing,
    transportAllowance: transport,
    otherAllowance: other,
    grossSalary,
    totalDeductions,
    netSalary,
  };
}

export interface GratuityCalculationResult {
  joiningDate: string;
  lastWorkingDate: string;
  serviceDays: number;
  serviceYearsBasisPoints: number; // e.g. 2.50 years = 250
  serviceYearsDisplay: string; // e.g. "2.5 years"
  basicSalaryAtCalculation: number; // in fils
  dailyRateFils: number;
  eligibleDays: number;
  gratuityAmountFils: number;
  policyVersion: string;
  isEligible: boolean;
  notes?: string;
}

/**
 * Calculate UAE End of Service Gratuity based on UAE Labor Law guidelines:
 * - Less than 1 year (< 365 days): 0 days
 * - 1 to 5 years: 21 days basic salary for each year of service (pro-rata)
 * - More than 5 years: 21 days/year for first 5 years (105 days) + 30 days/year for each additional year
 * - Maximum cap: 2 years (24 months) of basic salary
 */
export function calculateUAEGratuity(params: {
  basicSalaryFils: number;
  joiningDate: string;
  lastWorkingDate: string;
  policyVersion?: string;
}): GratuityCalculationResult {
  const { basicSalaryFils, joiningDate, lastWorkingDate, policyVersion = "uae_standard_v1" } = params;

  const start = new Date(joiningDate);
  const end = new Date(lastWorkingDate);

  const diffMs = end.getTime() - start.getTime();
  const serviceDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const serviceYears = serviceDays / 365.25;

  const serviceYearsBasisPoints = Math.round(serviceYears * 100);
  const serviceYearsDisplay = `${serviceYears.toFixed(2)} years`;

  // Daily rate based on 30 days standard calendar month
  const dailyRateFils = Math.round(basicSalaryFils / 30);

  if (serviceDays < 365) {
    return {
      joiningDate,
      lastWorkingDate,
      serviceDays,
      serviceYearsBasisPoints,
      serviceYearsDisplay,
      basicSalaryAtCalculation: basicSalaryFils,
      dailyRateFils,
      eligibleDays: 0,
      gratuityAmountFils: 0,
      policyVersion,
      isEligible: false,
      notes: "Less than 1 continuous year of service: Not eligible for End of Service Gratuity.",
    };
  }

  let eligibleDays = 0;
  if (serviceYears <= 5) {
    eligibleDays = serviceYears * 21;
  } else {
    eligibleDays = 5 * 21 + (serviceYears - 5) * 30;
  }

  const roundedEligibleDays = Math.round(eligibleDays * 100) / 100;
  let rawGratuity = Math.round(eligibleDays * dailyRateFils);

  // Cap at 2 years (24 months) of basic salary
  const maxCap = basicSalaryFils * 24;
  const isCapped = rawGratuity > maxCap;
  const gratuityAmountFils = isCapped ? maxCap : rawGratuity;

  return {
    joiningDate,
    lastWorkingDate,
    serviceDays,
    serviceYearsBasisPoints,
    serviceYearsDisplay,
    basicSalaryAtCalculation: basicSalaryFils,
    dailyRateFils,
    eligibleDays: Math.round(roundedEligibleDays),
    gratuityAmountFils,
    policyVersion,
    isEligible: true,
    notes: isCapped
      ? "Gratuity capped at maximum 2 years basic salary limit."
      : undefined,
  };
}
