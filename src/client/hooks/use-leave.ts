import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { LeaveBalance, LeaveRequest, LeaveType } from "../../shared/types/leave";

export const leaveKeys = { all: ["leave"] as const, types: () => [...leaveKeys.all, "types"] as const, balances: (year: number) => [...leaveKeys.all, "balances", year] as const, requests: (status?: string) => [...leaveKeys.all, "requests", status] as const };

export function useLeaveTypes() { return useQuery<LeaveType[]>({ queryKey: leaveKeys.types(), queryFn: () => apiClient.get<LeaveType[]>("/leave/types") }); }
export function useLeaveBalances(year: number) { return useQuery<LeaveBalance[]>({ queryKey: leaveKeys.balances(year), queryFn: () => apiClient.get<LeaveBalance[]>("/leave/balances", { params: { year } }) }); }
export function useLeaveRequests(status?: string) { return useQuery<LeaveRequest[]>({ queryKey: leaveKeys.requests(status), queryFn: () => apiClient.get<LeaveRequest[]>("/leave/requests", { params: { status } }) }); }
export function useCreateLeaveType() { const client = useQueryClient(); return useMutation({ mutationFn: (data: unknown) => apiClient.post<LeaveType>("/leave/types", data), onSuccess: () => client.invalidateQueries({ queryKey: leaveKeys.types() }) }); }
export function useReviewLeave() { const client = useQueryClient(); return useMutation({ mutationFn: ({ id, action, note }: { id: string; action: "approve" | "reject"; note?: string }) => apiClient.post(`/leave/requests/${id}/${action}`, { note }), onSuccess: () => client.invalidateQueries({ queryKey: leaveKeys.all }) }); }
