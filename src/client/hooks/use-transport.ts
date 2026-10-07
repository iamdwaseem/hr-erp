import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type {
  TransportRoute,
  TransportVehicle,
  TransportAssignment,
  TransportOverview,
} from "../../shared/types/transport";
import type {
  CreateRouteInput,
  UpdateRouteInput,
  CreateVehicleInput,
  UpdateVehicleInput,
  CreateAssignmentInput,
  UpdateAssignmentInput,
  EndAssignmentInput,
} from "../../shared/schemas/transport";

// Query keys
export const transportKeys = {
  all: ["transport"] as const,
  overview: () => [...transportKeys.all, "overview"] as const,
  routes: () => [...transportKeys.all, "routes"] as const,
  routesList: (params?: Record<string, any>) => [...transportKeys.routes(), "list", params] as const,
  routeDetail: (id: string) => [...transportKeys.routes(), "detail", id] as const,
  vehicles: () => [...transportKeys.all, "vehicles"] as const,
  vehiclesList: (params?: Record<string, any>) => [...transportKeys.vehicles(), "list", params] as const,
  vehicleDetail: (id: string) => [...transportKeys.vehicles(), "detail", id] as const,
  assignments: () => [...transportKeys.all, "assignments"] as const,
  assignmentsList: (params?: Record<string, any>) => [...transportKeys.assignments(), "list", params] as const,
  assignmentDetail: (id: string) => [...transportKeys.assignments(), "detail", id] as const,
  employeeCurrent: (employeeId: string) => [...transportKeys.assignments(), "employee-current", employeeId] as const,
  employeeHistory: (employeeId: string) => [...transportKeys.assignments(), "employee-history", employeeId] as const,
};

// 1. Overview
export function useTransportOverview() {
  return useQuery<TransportOverview>({
    queryKey: transportKeys.overview(),
    queryFn: () => apiClient.get<TransportOverview>("/transport/overview"),
  });
}

// 2. Routes
export function useTransportRoutes(params?: {
  search?: string;
  status?: string;
  all?: boolean;
}) {
  return useQuery<TransportRoute[]>({
    queryKey: transportKeys.routesList(params),
    queryFn: () =>
      apiClient.get<TransportRoute[]>("/transport/routes", {
        params: {
          search: params?.search,
          status: params?.status,
          all: params?.all ? "true" : undefined,
        },
      }),
  });
}

export function useTransportRoute(id: string) {
  return useQuery<TransportRoute>({
    queryKey: transportKeys.routeDetail(id),
    queryFn: () => apiClient.get<TransportRoute>(`/transport/routes/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateRouteInput) =>
      apiClient.post<TransportRoute>("/transport/routes", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportKeys.routes() });
      queryClient.invalidateQueries({ queryKey: transportKeys.overview() });
    },
  });
}

export function useUpdateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRouteInput }) =>
      apiClient.put<TransportRoute>(`/transport/routes/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: transportKeys.routes() });
      queryClient.invalidateQueries({ queryKey: transportKeys.routeDetail(id) });
      queryClient.invalidateQueries({ queryKey: transportKeys.overview() });
    },
  });
}

export function useActivateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/transport/routes/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportKeys.routes() });
      queryClient.invalidateQueries({ queryKey: transportKeys.overview() });
    },
  });
}

export function useDeactivateRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/transport/routes/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportKeys.routes() });
      queryClient.invalidateQueries({ queryKey: transportKeys.overview() });
    },
  });
}

// 3. Vehicles
export function useTransportVehicles(params?: {
  search?: string;
  status?: string;
  vehicleType?: string;
  all?: boolean;
}) {
  return useQuery<TransportVehicle[]>({
    queryKey: transportKeys.vehiclesList(params),
    queryFn: () =>
      apiClient.get<TransportVehicle[]>("/transport/vehicles", {
        params: {
          search: params?.search,
          status: params?.status,
          vehicleType: params?.vehicleType,
          all: params?.all ? "true" : undefined,
        },
      }),
  });
}

export function useTransportVehicle(id: string) {
  return useQuery<TransportVehicle>({
    queryKey: transportKeys.vehicleDetail(id),
    queryFn: () => apiClient.get<TransportVehicle>(`/transport/vehicles/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVehicleInput) =>
      apiClient.post<TransportVehicle>("/transport/vehicles", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportKeys.vehicles() });
      queryClient.invalidateQueries({ queryKey: transportKeys.overview() });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVehicleInput }) =>
      apiClient.put<TransportVehicle>(`/transport/vehicles/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: transportKeys.vehicles() });
      queryClient.invalidateQueries({ queryKey: transportKeys.vehicleDetail(id) });
      queryClient.invalidateQueries({ queryKey: transportKeys.overview() });
    },
  });
}

export function useActivateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/transport/vehicles/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportKeys.vehicles() });
      queryClient.invalidateQueries({ queryKey: transportKeys.overview() });
    },
  });
}

export function useDeactivateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post(`/transport/vehicles/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportKeys.vehicles() });
      queryClient.invalidateQueries({ queryKey: transportKeys.overview() });
    },
  });
}

// 4. Assignments
export function useTransportAssignments(params?: {
  employeeId?: string;
  routeId?: string;
  vehicleId?: string;
  status?: string;
  search?: string;
}) {
  return useQuery<TransportAssignment[]>({
    queryKey: transportKeys.assignmentsList(params),
    queryFn: () =>
      apiClient.get<TransportAssignment[]>("/transport/assignments", {
        params: {
          employeeId: params?.employeeId,
          routeId: params?.routeId,
          vehicleId: params?.vehicleId,
          status: params?.status,
          search: params?.search,
        },
      }),
  });
}

export function useEmployeeCurrentAssignment(employeeId: string) {
  return useQuery<TransportAssignment | null>({
    queryKey: transportKeys.employeeCurrent(employeeId),
    queryFn: () =>
      apiClient.get<TransportAssignment | null>(
        `/transport/assignments/employee/${employeeId}/current`
      ),
    enabled: Boolean(employeeId),
  });
}

export function useEmployeeAssignmentHistory(employeeId: string) {
  return useQuery<TransportAssignment[]>({
    queryKey: transportKeys.employeeHistory(employeeId),
    queryFn: () =>
      apiClient.get<TransportAssignment[]>(
        `/transport/assignments/employee/${employeeId}/history`
      ),
    enabled: Boolean(employeeId),
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAssignmentInput) =>
      apiClient.post<TransportAssignment>("/transport/assignments", data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transportKeys.assignments() });
      queryClient.invalidateQueries({ queryKey: transportKeys.employeeCurrent(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: transportKeys.employeeHistory(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: transportKeys.overview() });
      queryClient.invalidateQueries({ queryKey: transportKeys.routes() });
      queryClient.invalidateQueries({ queryKey: transportKeys.vehicles() });
    },
  });
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssignmentInput }) =>
      apiClient.put<TransportAssignment>(`/transport/assignments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportKeys.assignments() });
      queryClient.invalidateQueries({ queryKey: transportKeys.overview() });
      queryClient.invalidateQueries({ queryKey: transportKeys.routes() });
      queryClient.invalidateQueries({ queryKey: transportKeys.vehicles() });
    },
  });
}

export function useEndAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: EndAssignmentInput }) =>
      apiClient.post<TransportAssignment>(`/transport/assignments/${id}/end`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transportKeys.assignments() });
      queryClient.invalidateQueries({ queryKey: transportKeys.overview() });
      queryClient.invalidateQueries({ queryKey: transportKeys.routes() });
      queryClient.invalidateQueries({ queryKey: transportKeys.vehicles() });
    },
  });
}
