import React, { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { useLeaveBalances, useLeaveRequests, useLeaveTypes, useReviewLeave } from "../../hooks/use-leave";

export const LeavePage: React.FC = () => {
  const year = new Date().getFullYear();
  const { data: types = [] } = useLeaveTypes();
  const { data: balances = [] } = useLeaveBalances(year);
  const { data: requests = [] } = useLeaveRequests();
  const review = useReviewLeave();
  const [error, setError] = useState<string | null>(null);

  const handleReview = async (id: string, action: "approve" | "reject") => { try { await review.mutateAsync({ id, action }); } catch (err: any) { setError(err.message || "Unable to review leave request"); } };
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Leave Management</h1><p className="mt-1 text-sm text-muted-foreground">Manage leave balances and approve employee leave records.</p></div>
    {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2"><Card><CardHeader><CardTitle>Active Leave Types</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{types.filter((item) => item.status === "active").length}</div></CardContent></Card><Card><CardHeader><CardTitle>Pending Requests</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{requests.filter((item) => item.status === "pending").length}</div></CardContent></Card></div>
    <Card><CardHeader><CardTitle>{year} Leave Balances</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-left text-muted-foreground"><tr><th className="p-2">Employee</th><th className="p-2">Leave Type</th><th className="p-2">Available</th><th className="p-2">Used</th></tr></thead><tbody>{balances.map((balance) => <tr key={balance.id} className="border-b"><td className="p-2">{balance.employeeName}</td><td className="p-2">{balance.leaveTypeName}</td><td className="p-2 font-medium">{balance.available}</td><td className="p-2">{balance.used}</td></tr>)}</tbody></table></div></CardContent></Card>
    <Card><CardHeader><CardTitle>Leave Requests</CardTitle></CardHeader><CardContent><div className="space-y-3">{requests.length === 0 ? <p className="text-sm text-muted-foreground">No leave requests.</p> : requests.map((request) => <div key={request.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-medium">{request.employeeName} · {request.leaveTypeName}</div><div className="text-xs text-muted-foreground">{request.startDate} to {request.endDate} · {request.requestedDays} day(s) · {request.status}</div>{request.reason && <div className="mt-1 text-sm">{request.reason}</div>}</div>{request.status === "pending" && <div className="flex gap-2"><Button size="sm" onClick={() => handleReview(request.id, "approve")}><Check className="mr-1 h-4 w-4" />Approve</Button><Button size="sm" variant="outline" onClick={() => handleReview(request.id, "reject")}><X className="mr-1 h-4 w-4" />Reject</Button></div>}</div>)}</div></CardContent></Card>
  </div>;
};
