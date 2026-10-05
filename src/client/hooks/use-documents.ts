import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, authStorage } from "../lib/api-client";
import type {
  EmployeePassport,
  EmployeeVisa,
  EmployeeWorkPermit,
  EmployeeDocument,
  DocumentVerificationStatus,
} from "../../shared/types/document";
import type {
  PassportInput,
  VisaInput,
  WorkPermitInput,
} from "../../shared/schemas/document";

// ==========================================
// PASSPORT HOOKS
// ==========================================

export function usePassport(employeeId: string) {
  return useQuery<EmployeePassport | null>({
    queryKey: ["employee", employeeId, "passport"],
    queryFn: () => apiClient.get<EmployeePassport | null>(`/employees/${employeeId}/passport`),
    enabled: Boolean(employeeId),
  });
}

export function useCreatePassport(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PassportInput) =>
      apiClient.post<EmployeePassport>(`/employees/${employeeId}/passport`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "passport"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

export function useUpdatePassport(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PassportInput>) =>
      apiClient.put<EmployeePassport>(`/employees/${employeeId}/passport`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "passport"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

// ==========================================
// VISA HOOKS
// ==========================================

export function useVisa(employeeId: string) {
  return useQuery<EmployeeVisa | null>({
    queryKey: ["employee", employeeId, "visa"],
    queryFn: () => apiClient.get<EmployeeVisa | null>(`/employees/${employeeId}/visa`),
    enabled: Boolean(employeeId),
  });
}

export function useCreateVisa(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VisaInput) =>
      apiClient.post<EmployeeVisa>(`/employees/${employeeId}/visa`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "visa"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

export function useUpdateVisa(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<VisaInput>) =>
      apiClient.put<EmployeeVisa>(`/employees/${employeeId}/visa`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "visa"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

// ==========================================
// WORK PERMIT HOOKS
// ==========================================

export function useWorkPermit(employeeId: string) {
  return useQuery<EmployeeWorkPermit | null>({
    queryKey: ["employee", employeeId, "work-permit"],
    queryFn: () => apiClient.get<EmployeeWorkPermit | null>(`/employees/${employeeId}/work-permit`),
    enabled: Boolean(employeeId),
  });
}

export function useCreateWorkPermit(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WorkPermitInput) =>
      apiClient.post<EmployeeWorkPermit>(`/employees/${employeeId}/work-permit`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "work-permit"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

export function useUpdateWorkPermit(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkPermitInput>) =>
      apiClient.put<EmployeeWorkPermit>(`/employees/${employeeId}/work-permit`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "work-permit"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

// ==========================================
// DOCUMENT VAULT HOOKS
// ==========================================

export function useEmployeeDocuments(
  employeeId: string,
  filters?: { documentType?: string; verificationStatus?: string }
) {
  return useQuery<EmployeeDocument[]>({
    queryKey: ["employee", employeeId, "documents", filters],
    queryFn: () =>
      apiClient.get<EmployeeDocument[]>(`/employees/${employeeId}/documents`, {
        params: filters,
      }),
    enabled: Boolean(employeeId),
  });
}

export function useUploadDocument(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient.upload<EmployeeDocument>(`/employees/${employeeId}/documents`, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

export function useDeleteDocument(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) =>
      apiClient.delete<{ id: string; deleted: boolean }>(
        `/employees/${employeeId}/documents/${documentId}`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

export function useVerifyDocument(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      status,
    }: {
      documentId: string;
      status: DocumentVerificationStatus;
    }) =>
      apiClient.put<EmployeeDocument>(
        `/employees/${employeeId}/documents/${documentId}/verification`,
        { status }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "documents"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

/**
 * Direct authenticated file download trigger.
 */
export async function downloadDocumentFile(
  employeeId: string,
  documentId: string,
  originalFileName: string
): Promise<void> {
  const token = authStorage.getToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(
    `/api/employees/${employeeId}/documents/${documentId}/download`,
    {
      method: "GET",
      headers,
    }
  );

  if (!response.ok) {
    let errMessage = "Download failed";
    try {
      const errJson = await response.json();
      errMessage = errJson.error?.message || errMessage;
    } catch {
      // Ignore
    }
    throw new Error(errMessage);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = originalFileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}
