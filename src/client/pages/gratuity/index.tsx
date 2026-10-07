import React, { useState } from "react";
import {
  Calculator,
  CheckCircle2,
  FileText,
  Search,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Select } from "../../components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api-client";
import type { Employee } from "../../../shared/types/employee";
import type { GratuityRecord } from "../../../shared/types/payroll";
import {
  useCalculateGratuity,
  useGratuityRecords,
} from "../../hooks/use-gratuity";
import { GratuityFinalizeDialog } from "./gratuity-calculator-dialog";
import { formatCurrency } from "../../../shared/utils/payroll-calculations";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  calculated: { label: "Estimated", className: "bg-slate-500/10 text-slate-600" },
  finalized: { label: "Approved Settlement", className: "bg-emerald-500/10 text-emerald-600" },
  paid: { label: "Paid / Disbursed", className: "bg-purple-500/10 text-purple-600" },
};

interface GratuityPageProps {
  onViewEmployee?: (employeeId: string, initialTab?: any) => void;
}

export const GratuityPage: React.FC<GratuityPageProps> = () => {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [lastWorkingDate, setLastWorkingDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [basicSalaryOverride, setBasicSalaryOverride] = useState<string>("");
  const [calcResult, setCalcResult] = useState<any | null>(null);
  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState("");

  // Fetch employees list for dropdown
  const { data: employees = [], isLoading: isEmployeesLoading } = useQuery<Employee[]>({
    queryKey: ["employees", "active-list"],
    queryFn: async () => {
      const res = await apiClient.get<Employee[]>("/api/employees");
      return res || [];
    },
  });

  const { data: records = [], isLoading: isRecordsLoading } = useGratuityRecords();
  const calculateMutation = useCalculateGratuity();

  const handleCalculate = async () => {
    if (!selectedEmployeeId) {
      alert("Please select an employee first.");
      return;
    }

    try {
      const res = await calculateMutation.mutateAsync({
        employeeId: selectedEmployeeId,
        lastWorkingDate,
        basicSalaryOverride: basicSalaryOverride ? parseFloat(basicSalaryOverride) : null,
      });
      setCalcResult(res);
    } catch (err: any) {
      alert(err.message || "Failed to calculate gratuity");
    }
  };

  const filteredRecords = records.filter(
    (r: GratuityRecord) =>
      r.employeeName?.toLowerCase().includes(searchHistory.toLowerCase()) ||
      r.employeeCode?.toLowerCase().includes(searchHistory.toLowerCase()) ||
      r.departmentName?.toLowerCase().includes(searchHistory.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          End of Service Gratuity Settlement
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Authoritative End of Service Gratuity calculations based on standard UAE/Gulf labor regulations and service duration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Gratuity Calculator Card */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Gratuity Calculation Simulator
              </CardTitle>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="employee">Select Employee *</Label>
                  <Select
                    id="employee"
                    value={selectedEmployeeId}
                    onChange={(e) => {
                      setSelectedEmployeeId(e.target.value);
                      setCalcResult(null);
                    }}
                    disabled={isEmployeesLoading}
                  >
                    <option value="">-- Choose employee --</option>
                    {employees.map((emp: Employee) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.employeeCode}) — Joined: {emp.joiningDate}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="lastWorkingDate">Last Working Date *</Label>
                  <Input
                    id="lastWorkingDate"
                    type="date"
                    value={lastWorkingDate}
                    onChange={(e) => {
                      setLastWorkingDate(e.target.value);
                      setCalcResult(null);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="override">Basic Salary Override (AED Optional)</Label>
                  <Input
                    id="override"
                    type="number"
                    step="0.01"
                    placeholder="Leave empty to use active basic"
                    value={basicSalaryOverride}
                    onChange={(e) => {
                      setBasicSalaryOverride(e.target.value);
                      setCalcResult(null);
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleCalculate}
                  disabled={!selectedEmployeeId || calculateMutation.isPending}
                  className="gap-2"
                >
                  {calculateMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Calculate Gratuity
                </Button>
              </div>

              {/* Result Preview Box */}
              {calcResult && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 mt-4 animate-in fade-in duration-150">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">
                        Gratuity Estimate: {calcResult.employeeName}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Service Period: {calcResult.joiningDate} → {calcResult.lastWorkingDate}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block">Net Gratuity</span>
                      <span className="text-xl font-extrabold text-primary">
                        {formatCurrency(calcResult.gratuityAmountFils)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-primary/10 text-xs">
                    <div>
                      <span className="text-muted-foreground block">Duration:</span>
                      <span className="font-semibold text-foreground">{calcResult.serviceYearsDisplay}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Basic Salary:</span>
                      <span className="font-semibold text-foreground">{formatCurrency(calcResult.basicSalaryAtCalculation)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Eligible Days:</span>
                      <span className="font-semibold text-foreground">{calcResult.eligibleDays} days</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Day Rate:</span>
                      <span className="font-semibold text-foreground">{formatCurrency(calcResult.dailyRateFils)}</span>
                    </div>
                  </div>

                  {calcResult.notes && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-500/10 p-2.5 rounded-lg">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>{calcResult.notes}</span>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      onClick={() => setFinalizeDialogOpen(true)}
                      className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Finalize & Save Settlement
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Rule Information Card */}
        <div>
          <Card className="border shadow-sm">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Info className="h-4 w-4 text-muted-foreground" />
                UAE Labor Law Policy (v1)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-xs text-muted-foreground">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">&lt; 1 Year of Service:</p>
                <p>Not eligible for End of Service Gratuity.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">1 to 5 Years of Service:</p>
                <p>21 days' basic salary for each year of service (calculated pro-rata).</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">&gt; 5 Years of Service:</p>
                <p>21 days/year for first 5 years + 30 days/year for each additional year.</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Maximum Cap:</p>
                <p>Gratuity cannot exceed 2 years' (24 months) basic salary.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gratuity Settlements History Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Gratuity Settlement Records ({records.length})
          </h2>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search settlements..."
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {isRecordsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No gratuity settlement records saved yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[700px]">
              <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Joined / Exit</th>
                  <th className="py-3 px-4 text-right">Service</th>
                  <th className="py-3 px-4 text-right">Basic Salary</th>
                  <th className="py-3 px-4 text-right">Eligible Days</th>
                  <th className="py-3 px-4 text-right">Gratuity Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y text-xs">
                {filteredRecords.map((r: GratuityRecord) => (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">
                      <div>
                        <span>{r.employeeName}</span>
                        <span className="text-muted-foreground ml-1.5 text-[11px]">
                          ({r.employeeCode})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {r.joiningDate} → {r.lastWorkingDate}
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {(r.serviceYears / 100).toFixed(2)} yrs
                    </td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(r.basicSalaryAtCalculation)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.eligibleDays} days
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-primary">
                      {formatCurrency(r.gratuityAmount)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={STATUS_CONFIG[r.status]?.className || ""}
                      >
                        {STATUS_CONFIG[r.status]?.label || r.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {r.calculationDate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Finalize Settlement Dialog */}
      <GratuityFinalizeDialog
        isOpen={finalizeDialogOpen}
        onClose={() => setFinalizeDialogOpen(false)}
        calculation={calcResult}
      />
    </div>
  );
};
