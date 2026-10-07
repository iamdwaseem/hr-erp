import React, { useState } from "react";
import {
  FileText,
  Search,
  Sparkles,
  Loader2,
  Eye,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { Select } from "../../components/ui/select";
import type { PayrollPeriod, Payslip } from "../../../shared/types/payroll";
import { usePayrollPeriods } from "../../hooks/use-payroll";
import {
  usePayslips,
  usePayslip,
  useGeneratePayslips,
} from "../../hooks/use-payslips";
import { PayslipViewerModal } from "./payslip-viewer-modal";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  generated: { label: "Generated", className: "bg-blue-500/10 text-blue-600" },
  sent: { label: "Dispatched", className: "bg-amber-500/10 text-amber-600" },
  paid: { label: "Paid", className: "bg-emerald-500/10 text-emerald-600" },
};

interface PayslipsPageProps {
  onViewEmployee?: (employeeId: string, initialTab?: any) => void;
}

export const PayslipsPage: React.FC<PayslipsPageProps> = () => {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [viewPayslipId, setViewPayslipId] = useState<string | null>(null);

  const { data: periods = [] } = usePayrollPeriods();
  const { data: payslips = [], isLoading } = usePayslips({
    periodId: selectedPeriodId || undefined,
    search: search || undefined,
  });

  const { data: fullPayslipDetail } = usePayslip(viewPayslipId);
  const generateMutation = useGeneratePayslips();

  const handleBulkGenerate = async () => {
    if (!selectedPeriodId) {
      alert("Please select a payroll period to generate payslips for.");
      return;
    }

    try {
      const res = await generateMutation.mutateAsync({
        payrollPeriodId: selectedPeriodId,
      });
      alert(res.message);
    } catch (err: any) {
      alert(err.message || "Failed to generate payslips");
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
            <FileText className="h-6 w-6 text-primary" />
            Payslip Generation & Archive
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Generate, view, and print official employee payslips derived from finalized payroll snapshots.
          </p>
        </div>

        {selectedPeriodId && (
          <Button
            onClick={handleBulkGenerate}
            disabled={generateMutation.isPending}
            className="gap-2"
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate Payslips for Period
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-64 space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Filter by Pay Period
              </span>
              <Select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
              >
                <option value="">All Pay Periods</option>
                {periods.map((p: PayrollPeriod) => (
                  <option key={p.id} value={p.id}>
                    {monthNames[p.periodMonth - 1]} {p.periodYear} ({p.status.toUpperCase()})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employee or payslip #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payslips Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Payslip Records ({payslips.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : payslips.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No payslips found for the selected criteria.</p>
              {selectedPeriodId && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 gap-1.5"
                  onClick={handleBulkGenerate}
                  disabled={generateMutation.isPending}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Payslips Now
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[700px]">
              <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Payslip Number</th>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Pay Period</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Generated Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {payslips.map((ps: Payslip) => (
                  <tr key={ps.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {ps.payslipNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div>
                        <span>{ps.employeeName}</span>
                        <span className="text-muted-foreground ml-1.5 text-[11px]">
                          ({ps.employeeCode})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {ps.departmentName || "General"}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {ps.periodMonth && ps.periodYear
                        ? `${monthNames[ps.periodMonth - 1]} ${ps.periodYear}`
                        : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={STATUS_CONFIG[ps.status]?.className || ""}
                      >
                        {STATUS_CONFIG[ps.status]?.label || ps.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(ps.generatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => setViewPayslipId(ps.id)}
                        >
                          <Eye className="h-3 w-3" />
                          View / Print
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

      {/* Payslip Viewer & Print Modal */}
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
