import React, { useState } from "react";
import {
  Wallet,
  Plus,
  History,
  FileText,
  Calculator,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import {
  useEmployeeCurrentSalary,
  useEmployeeSalaryHistory,
} from "../../hooks/use-salary";
import { useEmployeePayslips, usePayslip } from "../../hooks/use-payslips";
import { useEmployeeGratuityHistory } from "../../hooks/use-gratuity";
import { AssignSalaryDialog } from "../salary/assign-salary-dialog";
import { PayslipViewerModal } from "../payslips/payslip-viewer-modal";
import { formatCurrency } from "../../../shared/utils/payroll-calculations";

interface EmployeeSalaryTabProps {
  employeeId: string;
  employeeName: string;
  employeeCode?: string;
  canEdit: boolean;
  subTab?: "salary" | "payroll" | "payslips" | "gratuity";
}

export const EmployeeSalaryTab: React.FC<EmployeeSalaryTabProps> = ({
  employeeId,
  employeeName,
  employeeCode: _employeeCode,
  canEdit,
  subTab = "salary",
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"salary" | "payroll" | "payslips" | "gratuity">(subTab);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [viewPayslipId, setViewPayslipId] = useState<string | null>(null);

  const { data: currentSalary, isLoading: isCurrentLoading } = useEmployeeCurrentSalary(employeeId);
  const { data: salaryHistory = [], isLoading: isHistoryLoading } = useEmployeeSalaryHistory(employeeId);
  const { data: payslips = [], isLoading: isPayslipsLoading } = useEmployeePayslips(employeeId);
  const { data: gratuityRecords = [], isLoading: isGratuityLoading } = useEmployeeGratuityHistory(employeeId);
  const { data: fullPayslipDetail } = usePayslip(viewPayslipId);

  return (
    <div className="space-y-6">
      {/* Sub-tabs header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSubTab("salary")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeSubTab === "salary"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            Current Package & History
          </button>
          <button
            onClick={() => setActiveSubTab("payslips")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeSubTab === "payslips"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Payslips ({payslips.length})
          </button>
          <button
            onClick={() => setActiveSubTab("gratuity")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeSubTab === "gratuity"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Calculator className="h-3.5 w-3.5" />
            Gratuity Settlement ({gratuityRecords.length})
          </button>
        </div>

        {canEdit && activeSubTab === "salary" && (
          <Button
            size="sm"
            onClick={() => setAssignModalOpen(true)}
            className="gap-1.5 h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Assign / Update Salary
          </Button>
        )}
      </div>

      {/* 1. SALARY COMPENSATION TAB */}
      {activeSubTab === "salary" && (
        <div className="space-y-6">
          {/* Current Salary Card */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  Active Compensation Package
                </CardTitle>
                {currentSalary && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 text-xs">
                    Active since {currentSalary.effectiveFrom}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {isCurrentLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !currentSalary ? (
                <div className="text-center py-6 text-xs text-muted-foreground space-y-3">
                  <p>No active salary package assigned for this employee.</p>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssignModalOpen(true)}
                      className="gap-1.5 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Assign Initial Salary
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="rounded-lg bg-muted/40 p-3 border">
                      <span className="text-muted-foreground block font-medium">Basic Salary</span>
                      <span className="text-base font-bold text-foreground mt-0.5 block">
                        {formatCurrency(currentSalary.basicSalary)}
                      </span>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-3 border">
                      <span className="text-muted-foreground block font-medium">Housing Allowance</span>
                      <span className="text-base font-bold text-foreground mt-0.5 block">
                        {formatCurrency(currentSalary.housingAllowance)}
                      </span>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-3 border">
                      <span className="text-muted-foreground block font-medium">Transport Allowance</span>
                      <span className="text-base font-bold text-foreground mt-0.5 block">
                        {formatCurrency(currentSalary.transportAllowance)}
                      </span>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-3 border">
                      <span className="text-muted-foreground block font-medium">Other Allowance</span>
                      <span className="text-base font-bold text-foreground mt-0.5 block">
                        {formatCurrency(currentSalary.otherAllowance)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl bg-primary/5 p-4 border border-primary/20">
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Monthly Net Compensation
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-extrabold text-primary">
                          {formatCurrency(currentSalary.netSalary)}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          Gross: {formatCurrency(currentSalary.grossSalary)}
                        </Badge>
                      </div>
                    </div>

                    {currentSalary.salaryStructureName && (
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground block">Salary Structure</span>
                        <span className="text-xs font-semibold text-foreground">
                          {currentSalary.salaryStructureName}
                        </span>
                      </div>
                    )}
                  </div>

                  {currentSalary.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border">
                      <span className="font-semibold text-foreground">Notes:</span> {currentSalary.notes}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Salary History Timeline */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                Salary Change History ({salaryHistory.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isHistoryLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : salaryHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No historical salary records.
                </p>
              ) : (
                <div className="rounded-xl border bg-card overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b uppercase tracking-wider text-muted-foreground text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Effective Period</th>
                        <th className="py-2.5 px-3">Structure</th>
                        <th className="py-2.5 px-3 text-right">Basic</th>
                        <th className="py-2.5 px-3 text-right">Gross</th>
                        <th className="py-2.5 px-3 text-right">Net</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {salaryHistory.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/30">
                          <td className="py-2.5 px-3 font-medium">
                            {s.effectiveFrom} {s.effectiveTo ? `→ ${s.effectiveTo}` : "(Active)"}
                          </td>
                          <td className="py-2.5 px-3">
                            {s.salaryStructureName || "Custom"}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {formatCurrency(s.basicSalary)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">
                            {formatCurrency(s.grossSalary)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-primary">
                            {formatCurrency(s.netSalary)}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="outline"
                              className={
                                s.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-600 text-[10px]"
                                  : "text-muted-foreground text-[10px]"
                              }
                            >
                              {s.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground truncate max-w-[150px]">
                            {s.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. PAYSLIPS SUBTAB */}
      {activeSubTab === "payslips" && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Employee Payslips Archive
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isPayslipsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : payslips.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No payslips generated for this employee yet.
              </p>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b uppercase tracking-wider text-muted-foreground text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Payslip #</th>
                      <th className="py-2.5 px-3">Pay Period</th>
                      <th className="py-2.5 px-3 text-right">Gross Earnings</th>
                      <th className="py-2.5 px-3 text-right">Net Payable</th>
                      <th className="py-2.5 px-3">Generated Date</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {payslips.map((ps) => (
                      <tr key={ps.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                          {ps.payslipNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          {ps.periodMonth && ps.periodYear
                            ? `${ps.periodMonth}/${ps.periodYear}`
                            : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatCurrency(ps.recordDetails?.grossEarnings)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-primary">
                          {formatCurrency(ps.recordDetails?.netSalary)}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {new Date(ps.generatedAt).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setViewPayslipId(ps.id)}
                          >
                            <Eye className="h-3 w-3" />
                            View / Print
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. GRATUITY SUBTAB */}
      {activeSubTab === "gratuity" && (
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              Gratuity Settlement Records
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {isGratuityLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : gratuityRecords.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No finalized gratuity settlements for this employee.
              </p>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b uppercase tracking-wider text-muted-foreground text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Last Working Date</th>
                      <th className="py-2.5 px-3">Service Duration</th>
                      <th className="py-2.5 px-3 text-right">Basic Salary</th>
                      <th className="py-2.5 px-3 text-right">Eligible Days</th>
                      <th className="py-2.5 px-3 text-right">Gratuity Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs">
                    {gratuityRecords.map((g) => (
                      <tr key={g.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-3 font-medium">
                          {g.lastWorkingDate}
                        </td>
                        <td className="py-2.5 px-3">
                          {(g.serviceYears / 100).toFixed(2)} yrs
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatCurrency(g.basicSalaryAtCalculation)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {g.eligibleDays} days
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-primary">
                          {formatCurrency(g.gratuityAmount)}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-[10px]">
                            {g.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {g.notes || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assign Salary Modal */}
      <AssignSalaryDialog
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        employeeId={employeeId}
        employeeName={employeeName}
      />

      {/* Payslip Viewer Modal */}
      {viewPayslipId && (
        <PayslipViewerModal
          isOpen={Boolean(viewPayslipId)}
          onClose={() => setViewPayslipId(null)}
          payslip={fullPayslipDetail}
        />
      )}
    </div>
  );
};
