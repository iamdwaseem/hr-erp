import React, { useState } from "react";
import {
  History,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { useAuditLogs } from "../../hooks/use-audit-logs";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Select } from "../../components/ui/select";

function formatTimestamp(isoStr: string) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

function getActionBadgeVariant(action: string) {
  const upper = action.toUpperCase();
  if (upper.includes("CREATE") || upper.includes("UPLOAD")) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
  }
  if (upper.includes("UPDATE")) {
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800";
  }
  if (upper.includes("DELETE")) {
    return "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
  }
  if (upper.includes("VERIFY")) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
  }
  return "bg-slate-50 text-slate-700 dark:bg-slate-900/60 dark:text-slate-300 border-slate-200 dark:border-slate-800";
}

function getActionIcon(action: string) {
  const upper = action.toUpperCase();
  if (upper.includes("CREATE") || upper.includes("UPLOAD")) {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
  }
  if (upper.includes("UPDATE")) {
    return <RotateCcw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />;
  }
  if (upper.includes("DELETE")) {
    return <Trash2 className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />;
  }
  if (upper.includes("VERIFY")) {
    return <Shield className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />;
  }
  return <Clock className="h-3.5 w-3.5 text-slate-500" />;
}

export const AuditLogPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const limit = 20;

  const { data: result, isLoading, isError, error, refetch } = useAuditLogs({
    page,
    limit,
    action: selectedAction !== "all" ? selectedAction : undefined,
    entityType: selectedEntity !== "all" ? selectedEntity : undefined,
    search: searchTerm.trim() || undefined,
    sortOrder,
  });

  const logs = result?.data || [];
  const meta = result?.meta;
  const total = meta?.total || 0;
  const totalPages = meta?.totalPages || Math.ceil(total / limit) || 1;

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedAction("all");
    setSelectedEntity("all");
    setSortOrder("desc");
    setPage(1);
  };

  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1); // Reset page on filter change
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <History className="h-6 w-6 text-primary" />
            Audit Log Viewer
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Chronological, immutable record of workforce mutations, compliance actions, and logins
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="self-start sm:self-auto gap-2 text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actor, ID, details..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-8 text-xs h-9"
              />
            </div>

            {/* Action Filter */}
            <div>
              <Select
                value={selectedAction}
                onChange={(e) => handleFilterChange(setSelectedAction)(e.target.value)}
                className="text-xs h-9"
              >
                <option value="all">All Actions</option>
                <option value="CREATE">CREATE (All Creations)</option>
                <option value="UPDATE">UPDATE (All Updates)</option>
                <option value="DELETE">DELETE (All Deletions)</option>
                <option value="VERIFY">VERIFY (Verifications)</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
              </Select>
            </div>

            {/* Entity Type Filter */}
            <div>
              <Select
                value={selectedEntity}
                onChange={(e) => handleFilterChange(setSelectedEntity)(e.target.value)}
                className="text-xs h-9"
              >
                <option value="all">All Entities</option>
                <option value="employee">Employee</option>
                <option value="passport">Passport</option>
                <option value="visa">Visa</option>
                <option value="work_permit">Work Permit</option>
                <option value="document">Document</option>
                <option value="auth">User / Auth</option>
              </Select>
            </div>

            {/* Sort Order & Reset */}
            <div className="flex items-center gap-2">
              <Select
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as "desc" | "asc");
                  setPage(1);
                }}
                className="text-xs h-9 flex-1"
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </Select>

              {(searchTerm || selectedAction !== "all" || selectedEntity !== "all" || sortOrder !== "desc") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
                  title="Reset all filters"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      <Card>
        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-semibold">Audit Records</CardTitle>
            <Badge variant="outline" className="text-xs">
              {total} total events
            </Badge>
          </div>
          {totalPages > 1 && (
            <div className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <RotateCcw className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-xs">Loading audit trail records...</p>
            </div>
          ) : isError ? (
            <div className="py-12 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <div>
                <p className="text-sm font-medium text-destructive">Failed to load audit logs</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {error instanceof Error ? error.message : "An unexpected error occurred"}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs">
                Retry
              </Button>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground space-y-2">
              <History className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">No audit entries found</p>
              <p className="text-xs">
                {searchTerm || selectedAction !== "all" || selectedEntity !== "all"
                  ? "Try clearing filters to view all audit entries"
                  : "Audit records will appear as system actions occur"}
              </p>
              {(searchTerm || selectedAction !== "all" || selectedEntity !== "all") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResetFilters}
                  className="text-xs mt-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-xs">
                  <thead className="bg-muted/40 font-medium text-muted-foreground">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold">Timestamp</th>
                      <th className="py-3 px-4 text-left font-semibold">Actor</th>
                      <th className="py-3 px-4 text-left font-semibold">Action</th>
                      <th className="py-3 px-4 text-left font-semibold">Entity</th>
                      <th className="py-3 px-4 text-left font-semibold">Entity ID</th>
                      <th className="py-3 px-4 text-right font-semibold">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {logs.map((log) => {
                      const isExpanded = Boolean(expandedRows[log.id]);
                      const hasDetails = Boolean(
                        log.oldValue || log.newValue || (log.details && Object.keys(log.details).length > 0)
                      );

                      return (
                        <React.Fragment key={log.id}>
                          <tr className="hover:bg-muted/30 transition-colors">
                            {/* Timestamp */}
                            <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                              {formatTimestamp(log.timestamp)}
                            </td>

                            {/* Actor */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {log.actor.fullName?.charAt(0) || "U"}
                                </div>
                                <div className="truncate max-w-[140px]">
                                  <p className="font-medium text-foreground truncate">
                                    {log.actor.fullName}
                                  </p>
                                  {log.actor.role && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {log.actor.role}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Action */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold uppercase tracking-wider py-0.5 px-2 flex items-center gap-1 w-fit border ${getActionBadgeVariant(
                                  log.action
                                )}`}
                              >
                                {getActionIcon(log.action)}
                                <span>{log.action}</span>
                              </Badge>
                            </td>

                            {/* Entity */}
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="capitalize font-medium text-foreground bg-muted/60 px-2 py-0.5 rounded text-[11px]">
                                {log.entityType.replace(/_/g, " ")}
                              </span>
                            </td>

                            {/* Entity ID */}
                            <td className="py-3 px-4 whitespace-nowrap font-mono text-muted-foreground text-[11px]">
                              {log.entityId ? (
                                <span className="bg-muted/40 px-1.5 py-0.5 rounded border text-[11px]">
                                  {log.entityId}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>

                            {/* Details Toggle */}
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              {hasDetails ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleRow(log.id)}
                                  className="h-7 px-2 text-xs font-normal text-primary hover:text-primary gap-1"
                                >
                                  <span>{isExpanded ? "Hide" : "View"}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">—</span>
                              )}
                            </td>
                          </tr>

                          {/* Expanded Details Row */}
                          {isExpanded && (
                            <tr className="bg-muted/15">
                              <td colSpan={6} className="p-4 border-y border-dashed border-border/80">
                                <div className="space-y-3 max-w-4xl">
                                  {/* Old & New Values Side-by-Side if available */}
                                  {(log.oldValue || log.newValue) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {log.oldValue && (
                                        <div className="p-2.5 rounded border bg-card text-xs">
                                          <p className="font-semibold text-muted-foreground text-[11px] uppercase mb-1">
                                            Previous State / Old Value
                                          </p>
                                          <pre className="text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap bg-muted/30 p-2 rounded">
                                            {JSON.stringify(log.oldValue, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                      {log.newValue && (
                                        <div className="p-2.5 rounded border bg-card text-xs">
                                          <p className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px] uppercase mb-1">
                                            Updated State / New Value
                                          </p>
                                          <pre className="text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap bg-emerald-50/30 dark:bg-emerald-950/20 p-2 rounded">
                                            {JSON.stringify(log.newValue, null, 2)}
                                          </pre>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Raw Details / Metadata */}
                                  {log.details && (
                                    <div className="p-2.5 rounded border bg-card text-xs">
                                      <p className="font-semibold text-muted-foreground text-[11px] uppercase mb-1">
                                        Payload Metadata
                                      </p>
                                      <pre className="text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap bg-muted/30 p-2 rounded">
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {/* Client Information */}
                                  {(log.ipAddress || log.userAgent) && (
                                    <div className="flex flex-wrap items-center gap-4 text-[10px] text-muted-foreground pt-1">
                                      {log.ipAddress && (
                                        <div>
                                          <span className="font-semibold">IP Address:</span>{" "}
                                          <span className="font-mono">{log.ipAddress}</span>
                                        </div>
                                      )}
                                      {log.userAgent && (
                                        <div className="truncate max-w-xl">
                                          <span className="font-semibold">User-Agent:</span>{" "}
                                          <span>{log.userAgent}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="block md:hidden divide-y divide-border">
                {logs.map((log) => {
                  const isExpanded = Boolean(expandedRows[log.id]);
                  const hasDetails = Boolean(
                    log.oldValue || log.newValue || (log.details && Object.keys(log.details).length > 0)
                  );

                  return (
                    <div key={log.id} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold uppercase tracking-wider py-0.5 px-2 flex items-center gap-1 border ${getActionBadgeVariant(
                            log.action
                          )}`}
                        >
                          {getActionIcon(log.action)}
                          <span>{log.action}</span>
                        </Badge>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div>
                          <p className="text-[10px] uppercase font-medium text-muted-foreground">Actor</p>
                          <p className="font-medium text-foreground truncate">{log.actor.fullName}</p>
                          {log.actor.role && (
                            <p className="text-[10px] text-muted-foreground">{log.actor.role}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-medium text-muted-foreground">Entity</p>
                          <p className="font-medium text-foreground capitalize">
                            {log.entityType.replace(/_/g, " ")}
                          </p>
                          {log.entityId && (
                            <p className="text-[10px] font-mono text-muted-foreground truncate">
                              {log.entityId}
                            </p>
                          )}
                        </div>
                      </div>

                      {hasDetails && (
                        <div className="pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => toggleRow(log.id)}
                            className="w-full text-xs h-7 justify-between"
                          >
                            <span>{isExpanded ? "Hide Details" : "View Details"}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          {isExpanded && (
                            <div className="mt-2 space-y-2 p-2.5 rounded bg-muted/40 border text-xs">
                              {log.oldValue && (
                                <div>
                                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                                    Old Value:
                                  </p>
                                  <pre className="text-[10px] font-mono bg-card p-1.5 rounded overflow-x-auto mt-0.5">
                                    {JSON.stringify(log.oldValue, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.newValue && (
                                <div>
                                  <p className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400">
                                    New Value:
                                  </p>
                                  <pre className="text-[10px] font-mono bg-card p-1.5 rounded overflow-x-auto mt-0.5">
                                    {JSON.stringify(log.newValue, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.details && (
                                <div>
                                  <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                                    Details:
                                  </p>
                                  <pre className="text-[10px] font-mono bg-card p-1.5 rounded overflow-x-auto mt-0.5">
                                    {JSON.stringify(log.details, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.ipAddress && (
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  IP: {log.ipAddress}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="p-3 border-t flex items-center justify-between gap-2 text-xs">
            <div className="text-muted-foreground">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} entries
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-medium">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
export default AuditLogPage;
