import React, { useState } from "react";
import {
  Wallet,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  useSalaryStructures,
  useDeactivateSalaryStructure,
  useActivateSalaryStructure,
  useDeleteSalaryStructure,
  useEmployeeSalaries,
} from "../../hooks/use-salary";
import { SalaryStructureDialog } from "./salary-structure-dialog";
import { AssignSalaryDialog } from "./assign-salary-dialog";
import { formatCurrency } from "../../../shared/utils/payroll-calculations";
import type { SalaryStructure, EmployeeSalary } from "../../../shared/types/payroll";

interface SalaryPageProps {
  onViewEmployee?: (employeeId: string, initialTab?: any) => void;
}

export const SalaryPage: React.FC<SalaryPageProps> = ({ onViewEmployee }) => {
  const [activeTab, setActiveTab] = useState<"structures" | "salaries">("structures");
  const [search, setSearch] = useState("");
  const [structureModalOpen, setStructureModalOpen] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState<SalaryStructure | null>(null);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignEmployeeId, setAssignEmployeeId] = useState<string>("");
  const [assignEmployeeName, setAssignEmployeeName] = useState<string>("");

  const { data: structures = [], isLoading: isStructuresLoading } = useSalaryStructures();
  const { data: employeeSalaries = [], isLoading: isSalariesLoading } = useEmployeeSalaries();

  const deactivateMutation = useDeactivateSalaryStructure();
  const activateMutation = useActivateSalaryStructure();
  const deleteMutation = useDeleteSalaryStructure();

  const filteredStructures = structures.filter(
    (s: SalaryStructure) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSalaries = employeeSalaries.filter(
    (e: EmployeeSalary) =>
      e.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
      e.employeeCode?.toLowerCase().includes(search.toLowerCase()) ||
      e.salaryStructureName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDeactivateStructure = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this salary structure?")) return;
    try {
      await deactivateMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err.message || "Failed to deactivate structure");
    }
  };

  const handleActivateStructure = async (id: string) => {
    try {
      await activateMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err.message || "Failed to activate structure");
    }
  };

  const handleDeleteStructure = async (id: string) => {
    if (!confirm("Are you sure you want to delete this salary structure?")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err: any) {
      alert(err.message || "Failed to delete structure");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Salary & Compensation Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure salary structures, assign employee packages, and maintain historical compensation snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "structures" ? (
            <Button
              onClick={() => {
                setSelectedStructure(null);
                setStructureModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New Salary Structure
            </Button>
          ) : (
            <Button
              onClick={() => {
                setAssignEmployeeId("");
                setAssignEmployeeName("");
                setAssignModalOpen(true);
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Assign Salary
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("structures")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "structures"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Salary Structures ({structures.length})
          </button>
          <button
            onClick={() => setActiveTab("salaries")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "salaries"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Active Employee Salaries ({employeeSalaries.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-64 mb-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              activeTab === "structures"
                ? "Search structures..."
                : "Search employees..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* TAB 1: SALARY STRUCTURES */}
      {activeTab === "structures" && (
        <div>
          {isStructuresLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredStructures.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No salary structures found.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 gap-1"
                  onClick={() => {
                    setSelectedStructure(null);
                    setStructureModalOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create First Structure
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStructures.map((struct: SalaryStructure) => {
                const gross =
                  struct.basicSalary +
                  struct.housingAllowance +
                  struct.transportAllowance +
                  struct.otherAllowance;

                return (
                  <Card key={struct.id} className="relative overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="text-[10px] mb-1">
                            {struct.code}
                          </Badge>
                          <CardTitle className="text-base font-semibold">
                            {struct.name}
                          </CardTitle>
                        </div>
                        <Badge
                          variant={struct.status === "active" ? "default" : "secondary"}
                          className={
                            struct.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                              : ""
                          }
                        >
                          {struct.status}
                        </Badge>
                      </div>
                      {struct.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {struct.description}
                        </p>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-3 pt-1">
                      <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5 border">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Basic Salary:</span>
                          <span className="font-semibold text-foreground">
                            {formatCurrency(struct.basicSalary)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Housing Allowance:</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(struct.housingAllowance)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transport Allowance:</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(struct.transportAllowance)}
                          </span>
                        </div>
                        {struct.otherAllowance > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Other Allowance:</span>
                            <span className="font-medium text-foreground">
                              {formatCurrency(struct.otherAllowance)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1.5 border-t font-semibold">
                          <span className="text-foreground">Gross Salary:</span>
                          <span className="text-primary font-bold">
                            {formatCurrency(gross)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => {
                            setSelectedStructure(struct);
                            setStructureModalOpen(true);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </Button>

                        {struct.status === "active" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-amber-600 hover:text-amber-700"
                            onClick={() => handleDeactivateStructure(struct.id)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-emerald-600 hover:text-emerald-700"
                            onClick={() => handleActivateStructure(struct.id)}
                          >
                            Activate
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteStructure(struct.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVE EMPLOYEE SALARIES */}
      {activeTab === "salaries" && (
        <div>
          {isSalariesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredSalaries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No active employee salaries recorded.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Structure</th>
                    <th className="py-3 px-4 text-right">Basic</th>
                    <th className="py-3 px-4 text-right">Gross</th>
                    <th className="py-3 px-4 text-right">Deductions</th>
                    <th className="py-3 px-4 text-right">Net Payable</th>
                    <th className="py-3 px-4">Effective Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {filteredSalaries.map((sal: EmployeeSalary) => (
                    <tr key={sal.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">
                        <div>
                          <span>{sal.employeeName}</span>
                          <span className="text-muted-foreground ml-1.5 text-[11px]">
                            ({sal.employeeCode})
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {sal.salaryStructureName ? (
                          <Badge variant="outline" className="text-[10px]">
                            {sal.salaryStructureName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Custom Package</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(sal.basicSalary)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-foreground">
                        {formatCurrency(sal.grossSalary)}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600 font-medium">
                        {formatCurrency(sal.deductions)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-primary">
                        {formatCurrency(sal.netSalary)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {sal.effectiveFrom}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setAssignEmployeeId(sal.employeeId);
                              setAssignEmployeeName(sal.employeeName || "");
                              setAssignModalOpen(true);
                            }}
                          >
                            Change
                          </Button>
                          {onViewEmployee && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => onViewEmployee(sal.employeeId, "salary")}
                            >
                              Profile
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Structure Modal */}
      <SalaryStructureDialog
        isOpen={structureModalOpen}
        onClose={() => setStructureModalOpen(false)}
        structure={selectedStructure}
      />

      {/* Assign Salary Modal */}
      <AssignSalaryDialog
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        employeeId={assignEmployeeId}
        employeeName={assignEmployeeName}
      />
    </div>
  );
};
