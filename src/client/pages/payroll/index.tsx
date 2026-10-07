import React, { useState } from "react";
import {
  CreditCard,
  Plus,
  Search,
  Play,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  FileCheck,
  Loader2,
  Users,
  Sliders,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { Select } from "../../components/ui/select";
import type { PayrollPeriod, PayrollRecord } from "../../../shared/types/payroll";
import {
  usePayrollPeriods,
  usePayrollPeriod,
  usePayrollRecords,
  useGeneratePayroll,
  useProcessPayrollPeriod,
  useApprovePayrollPeriod,
  useMarkPayrollPeriodPaid,
} from "../../hooks/use-payroll";
import { CreatePeriodDialog } from "./create-period-dialog";
import { PayrollAdjustmentsDialog } from "./payroll-adjustments-dialog";
import { formatCurrency } from "../../../shared/utils/payroll-calculations";

const STATUS_BADGE_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-500/10 text-slate-600" },
  processing: { label: "Processing", className: "bg-amber-500/10 text-amber-600" },
  processed: { label: "Processed", className: "bg-blue-500/10 text-blue-600" },
  approved: { label: "Approved (Locked)", className: "bg-emerald-500/10 text-emerald-600" },
  paid: { label: "Paid & Finalized", className: "bg-purple-500/10 text-purple-600" },
  cancelled: { label: "Cancelled", className: "bg-rose-500/10 text-rose-600" },
};

interface PayrollPageProps {
  onViewEmployee?: (employeeId: string, initialTab?: any) => void;
}

export const PayrollPage: React.FC<PayrollPageProps> = () => {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [createPeriodOpen, setCreatePeriodOpen] = useState(false);

  const [adjustmentsRecordId, setAdjustmentsRecordId] = useState<string | null>(null);
  const [generationResult, setGenerationResult] = useState<{
    exceptions: Array<{ employeeId: string; employeeName: string; employeeCode: string; reason: string }>;
  } | null>(null);

  const { data: periods = [], isLoading: isPeriodsLoading } = usePayrollPeriods();

  // Auto-select most recent period
  const activePeriodId = selectedPeriodId || (periods[0]?.id ?? "");
  const { data: currentPeriod } = usePayrollPeriod(activePeriodId);
  const { data: records = [], isLoading: isRecordsLoading } = usePayrollRecords(activePeriodId, search);

  const generateMutation = useGeneratePayroll();
  const processMutation = useProcessPayrollPeriod();
  const approveMutation = useApprovePayrollPeriod();
  const markPaidMutation = useMarkPayrollPeriodPaid();

  const isLocked = currentPeriod?.status === "approved" || currentPeriod?.status === "paid";

  const handleGeneratePayroll = async () => {
    if (!activePeriodId) return;
    try {
      const res = await generateMutation.mutateAsync(activePeriodId);
      if (res.exceptionsCount > 0) {
        setGenerationResult({ exceptions: res.exceptions });
      } else {
        setGenerationResult(null);
      }
    } catch (err: any) {
      alert(err.message || "Failed to generate payroll");
    }
  };

  const handleProcessPayroll = async () => {
    if (!activePeriodId) return;
    try {
      await processMutation.mutateAsync(activePeriodId);
    } catch (err: any) {
      alert(err.message || "Failed to process payroll");
    }
  };

  const handleApprovePayroll = async () => {
    if (!activePeriodId) return;
    if (
      !confirm(
        "Approving payroll will lock all salary snapshots and adjustments. Are you sure you want to approve this payroll run?"
      )
    )
      return;

    try {
      await approveMutation.mutateAsync(activePeriodId);
    } catch (err: any) {
      alert(err.message || "Failed to approve payroll");
    }
  };

  const handleMarkPaid = async () => {
    if (!activePeriodId) return;
    if (
      !confirm(
        "Marking payroll as paid makes the period completely immutable. Are you sure you want to finalize this payment run?"
      )
    )
      return;

    try {
      await markPaidMutation.mutateAsync(activePeriodId);
    } catch (err: any) {
      alert(err.message || "Failed to mark payroll as paid");
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Payroll Processing & Runs
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Process monthly payroll snapshots, review salary allowances, manage itemized adjustments, and finalize payout batches.
          </p>
        </div>

        <Button onClick={() => setCreatePeriodOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Payroll Period
        </Button>
      </div>

      {/* Period Selector & Workflow Action Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="space-y-1 w-full md:w-64">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Select Pay Period
              </span>
              <Select
                value={activePeriodId}
                onChange={(e) => {
                  setSelectedPeriodId(e.target.value);
                  setGenerationResult(null);
                }}
                disabled={isPeriodsLoading || periods.length === 0}
              >
                {periods.map((p: PayrollPeriod) => (
                  <option key={p.id} value={p.id}>
                    {monthNames[p.periodMonth - 1]} {p.periodYear} ({p.status.toUpperCase()})
                  </option>
                ))}
              </Select>
            </div>

            {currentPeriod && (
              <div className="mt-4">
                <Badge
                  variant="outline"
                  className={
                    STATUS_BADGE_CONFIG[currentPeriod.status]?.className || ""
                  }
                >
                  {STATUS_BADGE_CONFIG[currentPeriod.status]?.label || currentPeriod.status}
                </Badge>
              </div>
            )}
          </div>

          {/* Workflow Stage Buttons */}
          {currentPeriod && (
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              {/* 1. Generate / Regenerate */}
              {!isLocked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePayroll}
                  disabled={generateMutation.isPending}
                  className="gap-1.5 text-xs"
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-primary" />
                  )}
                  {records.length > 0 ? "Regenerate Payroll" : "Generate Payroll"}
                </Button>
              )}

              {/* 2. Process */}
              {currentPeriod.status === "draft" && records.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleProcessPayroll}
                  disabled={processMutation.isPending}
                  className="gap-1.5 text-xs"
                >
                  <FileCheck className="h-3.5 w-3.5 text-blue-600" />
                  Mark Processed
                </Button>
              )}

              {/* 3. Approve */}
              {currentPeriod.status === "processed" && (
                <Button
                  size="sm"
                  onClick={handleApprovePayroll}
                  disabled={approveMutation.isPending}
                  className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Approve Payroll
                </Button>
              )}

              {/* 4. Mark Paid */}
              {currentPeriod.status === "approved" && (
                <Button
                  size="sm"
                  onClick={handleMarkPaid}
                  disabled={markPaidMutation.isPending}
                  className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  Mark as Paid
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exception Warning Banner if any unassigned employees were skipped during generation */}
      {generationResult && generationResult.exceptions.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Payroll Generation Exceptions ({generationResult.exceptions.length})</span>
          </div>
          <p className="text-muted-foreground">
            The following employees do not have an active salary record on or before this period and were skipped:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-amber-900 font-medium">
            {generationResult.exceptions.map((exc) => (
              <li key={exc.employeeId}>
                {exc.employeeName} ({exc.employeeCode}) — {exc.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Overview Stat Cards */}
      {currentPeriod && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <span className="text-xs text-muted-foreground font-medium">Headcount</span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-foreground">
                {currentPeriod.totalEmployees || 0}
              </div>
              <p className="text-[11px] text-muted-foreground">Employees in run</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <span className="text-xs text-muted-foreground font-medium">Gross Earnings</span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-foreground">
                {formatCurrency(currentPeriod.totalGross)}
              </div>
              <p className="text-[11px] text-muted-foreground">Base + Allowances</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <span className="text-xs text-muted-foreground font-medium">Total Deductions</span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-rose-600">
                {formatCurrency(currentPeriod.totalDeductions)}
              </div>
              <p className="text-[11px] text-muted-foreground">Adjustments & penalties</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1 pt-4 px-4">
              <span className="text-xs text-muted-foreground font-medium">Net Payout</span>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold text-primary">
                {formatCurrency(currentPeriod.totalNet)}
              </div>
              <p className="text-[11px] text-muted-foreground">Total disbursement</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Records Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            Payroll Records ({records.length})
          </h2>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search in payroll records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {isRecordsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No payroll records for this period.</p>
              {!isLocked && (
                <Button
                  size="sm"
                  className="mt-3 gap-1.5"
                  onClick={handleGeneratePayroll}
                  disabled={generateMutation.isPending}
                >
                  <Play className="h-3.5 w-3.5" />
                  Generate Payroll Now
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[750px]">
              <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-right">Basic</th>
                  <th className="py-3 px-4 text-right">Gross</th>
                  <th className="py-3 px-4 text-right">Deductions</th>
                  <th className="py-3 px-4 text-right">Net Payable</th>
                  <th className="py-3 px-4 text-center">Adjustments</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {records.map((rec: PayrollRecord) => (
                  <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div>
                        <span>{rec.employeeName}</span>
                        <span className="text-muted-foreground ml-1.5 text-[11px]">
                          ({rec.employeeCode})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {rec.departmentName || "General"}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(rec.basicSalary)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-foreground">
                      {formatCurrency(rec.grossEarnings)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-rose-600">
                      {formatCurrency(rec.totalDeductions)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-primary">
                      {formatCurrency(rec.netSalary)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {rec.adjustments && rec.adjustments.length > 0 ? (
                        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary">
                          {rec.adjustments.length} item(s)
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setAdjustmentsRecordId(rec.id)}
                        >
                          <Sliders className="h-3 w-3" />
                          Adjustments
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Period Modal */}
      <CreatePeriodDialog
        isOpen={createPeriodOpen}
        onClose={() => setCreatePeriodOpen(false)}
      />

      {/* Adjustments Modal */}
      {adjustmentsRecordId && (
        <PayrollAdjustmentsDialog
          isOpen={Boolean(adjustmentsRecordId)}
          onClose={() => setAdjustmentsRecordId(null)}
          recordId={adjustmentsRecordId}
          isLocked={isLocked}
        />
      )}
    </div>
  );
};
