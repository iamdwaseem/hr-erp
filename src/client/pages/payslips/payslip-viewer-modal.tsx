import React from "react";
import { X, Printer, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { formatCurrency } from "../../../shared/utils/payroll-calculations";

interface PayslipViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  payslip: any | null;
}

export const PayslipViewerModal: React.FC<PayslipViewerModalProps> = ({
  isOpen,
  onClose,
  payslip,
}) => {
  if (!isOpen || !payslip) return null;

  const handlePrint = () => {
    window.print();
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const periodTitle = `${monthNames[(payslip.periodMonth || 1) - 1]} ${payslip.periodYear || ""}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="w-full max-w-2xl rounded-xl bg-card p-6 shadow-2xl border animate-in fade-in zoom-in-95 duration-150 print:border-none print:shadow-none print:max-w-full">
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between border-b pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Official Payslip
            </span>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {payslip.payslipNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
            <button
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE PAYSLIP CONTAINER */}
        <div className="mt-4 p-4 border rounded-xl bg-background space-y-6 print:border-none print:p-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4">
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-xl">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-extrabold text-sm">
                  HR
                </div>
                <span>HR ERP Platform LLC</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Dubai, United Arab Emirates • info@hr-erp.local
              </p>
            </div>
            <div className="text-right">
              <h1 className="text-lg font-bold text-foreground">PAYSLIP</h1>
              <p className="text-xs font-semibold text-primary">{periodTitle}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Ref: {payslip.payslipNumber}
              </p>
            </div>
          </div>

          {/* Employee & Pay Period Details */}
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-4 text-xs">
            <div className="space-y-1.5">
              <div>
                <span className="text-muted-foreground">Employee Name:</span>
                <span className="font-semibold text-foreground ml-2">{payslip.employeeName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Employee ID:</span>
                <span className="font-medium text-foreground ml-2">{payslip.employeeCode}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Department:</span>
                <span className="font-medium text-foreground ml-2">{payslip.departmentName || "General"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Designation:</span>
                <span className="font-medium text-foreground ml-2">{payslip.designationName || "Staff"}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div>
                <span className="text-muted-foreground">Pay Period:</span>
                <span className="font-semibold text-foreground ml-2">{periodTitle}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Period Dates:</span>
                <span className="font-medium text-foreground ml-2">{payslip.startDate} to {payslip.endDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Payable Days:</span>
                <span className="font-medium text-foreground ml-2">{payslip.payableDays || 30} days</span>
              </div>
              <div>
                <span className="text-muted-foreground">Currency:</span>
                <span className="font-medium text-foreground ml-2">{payslip.currency || "AED"}</span>
              </div>
            </div>
          </div>

          {/* Earnings and Deductions Table */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            {/* Earnings Column */}
            <div>
              <div className="border-b pb-1.5 font-semibold text-foreground flex justify-between">
                <span>EARNINGS</span>
                <span>AMOUNT (AED)</span>
              </div>
              <div className="divide-y pt-1 space-y-1.5">
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Basic Salary</span>
                  <span className="font-medium text-foreground">{formatCurrency(payslip.basicSalary, "", false)}</span>
                </div>
                {payslip.housingAllowance > 0 && (
                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>Housing Allowance</span>
                    <span className="font-medium text-foreground">{formatCurrency(payslip.housingAllowance, "", false)}</span>
                  </div>
                )}
                {payslip.transportAllowance > 0 && (
                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>Transport Allowance</span>
                    <span className="font-medium text-foreground">{formatCurrency(payslip.transportAllowance, "", false)}</span>
                  </div>
                )}
                {payslip.otherAllowance > 0 && (
                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>Other Allowance</span>
                    <span className="font-medium text-foreground">{formatCurrency(payslip.otherAllowance, "", false)}</span>
                  </div>
                )}
                {/* Additional Adjustments (Earnings) */}
                {payslip.adjustments?.filter((a: any) => a.type === "EARNING").map((a: any) => (
                  <div key={a.id} className="flex justify-between py-1 text-emerald-600">
                    <span>{a.name}</span>
                    <span className="font-medium">{formatCurrency(a.amount, "", false)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Deductions Column */}
            <div>
              <div className="border-b pb-1.5 font-semibold text-foreground flex justify-between">
                <span>DEDUCTIONS</span>
                <span>AMOUNT (AED)</span>
              </div>
              <div className="divide-y pt-1 space-y-1.5">
                {payslip.deductions > 0 && (
                  <div className="flex justify-between py-1 text-muted-foreground">
                    <span>Standard Deductions</span>
                    <span className="font-medium text-foreground">{formatCurrency(payslip.deductions, "", false)}</span>
                  </div>
                )}
                {/* Additional Adjustments (Deductions) */}
                {payslip.adjustments?.filter((a: any) => a.type === "DEDUCTION").map((a: any) => (
                  <div key={a.id} className="flex justify-between py-1 text-rose-600">
                    <span>{a.name}</span>
                    <span className="font-medium">{formatCurrency(a.amount, "", false)}</span>
                  </div>
                ))}
                {(!payslip.deductions && (!payslip.adjustments || payslip.adjustments.filter((a: any) => a.type === "DEDUCTION").length === 0)) && (
                  <div className="flex justify-between py-1 text-muted-foreground italic">
                    <span>No Deductions</span>
                    <span>0.00</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Financial Totals Block */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-xs space-y-2">
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Total Gross Earnings:</span>
              <span className="font-semibold text-foreground">{formatCurrency(payslip.grossEarnings)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Total Deductions:</span>
              <span className="font-semibold text-rose-600">{formatCurrency(payslip.totalDeductions)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-primary/20 text-base font-bold text-foreground">
              <span>NET PAYABLE AMOUNT:</span>
              <span className="text-primary">{formatCurrency(payslip.netSalary)}</span>
            </div>
          </div>

          {/* Footer note & Verification */}
          <div className="pt-4 border-t flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Generated from approved payroll records • Confidential HR Document</span>
            </div>
            <div>
              <span>Generated on: {new Date(payslip.generatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Footer Close Button (Hidden in Print) */}
        <div className="mt-4 flex justify-end print:hidden">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
