import { useState } from "react";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_VERIFICATION_CONFIG,
  DOCUMENT_STATUS_CONFIG,
  type DocumentVerificationStatus,
  type EmployeeDocument,
} from "../../../shared/types/document";
import {
  useEmployeeDocuments,
  useDeleteDocument,
  useVerifyDocument,
  downloadDocumentFile,
} from "../../hooks/use-documents";
import { Card, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { UploadDocumentDialog } from "./upload-document-dialog";
import {
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  FileText,
  Loader2,
  AlertCircle,
  FileCheck2,
} from "lucide-react";

interface DocumentVaultTabProps {
  employeeId: string;
  canManage: boolean; // ADMIN or HR
}

export function DocumentVaultTab({ employeeId, canManage }: DocumentVaultTabProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: documents, isLoading, error, refetch } = useEmployeeDocuments(employeeId);
  const deleteMutation = useDeleteDocument(employeeId);
  const verifyMutation = useVerifyDocument(employeeId);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (doc: EmployeeDocument) => {
    setActionError(null);
    setDownloadingId(doc.id);
    try {
      await downloadDocumentFile(employeeId, doc.id, doc.originalFileName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to download document";
      setActionError(msg);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc: EmployeeDocument) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${doc.originalFileName}" from storage?`)) {
      return;
    }
    setActionError(null);
    setDeletingId(doc.id);
    try {
      await deleteMutation.mutateAsync(doc.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete document";
      setActionError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleVerificationChange = async (
    doc: EmployeeDocument,
    newStatus: DocumentVerificationStatus
  ) => {
    setActionError(null);
    setVerifyingId(doc.id);
    try {
      await verifyMutation.mutateAsync({
        documentId: doc.id,
        status: newStatus,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update verification status";
      setActionError(msg);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Document Vault</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cloudflare R2 verified files & compliance records
          </p>
        </div>

        {canManage && (
          <Button onClick={() => setIsUploadOpen(true)} className="gap-2" size="sm">
            <Upload className="h-4 w-4" />
            <span>Upload Document</span>
          </Button>
        )}
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex min-h-[220px] items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="border-destructive/30 text-center py-8">
          <p className="text-sm text-destructive font-medium">Failed to load documents</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
            Retry
          </Button>
        </Card>
      ) : !documents || documents.length === 0 ? (
        <Card className="border-dashed text-center py-12">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileCheck2 className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4 text-lg">No documents uploaded yet.</CardTitle>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
            Uploaded compliance documents, contracts, and identification files will appear here.
          </p>
          {canManage && (
            <div className="mt-6">
              <Button onClick={() => setIsUploadOpen(true)} className="gap-2" size="sm">
                <Upload className="h-4 w-4" />
                <span>Upload First Document</span>
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Identifier</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3">Verification</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {documents.map((doc) => {
                  const verConfig =
                    DOCUMENT_VERIFICATION_CONFIG[doc.verificationStatus] || {
                      label: doc.verificationStatus,
                      variant: "secondary" as const,
                    };
                  const expiryConfig = doc.status
                    ? DOCUMENT_STATUS_CONFIG[doc.status]
                    : null;

                  return (
                    <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <div className="flex items-center gap-2 max-w-[220px]">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="truncate" title={doc.originalFileName}>
                            {doc.originalFileName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-medium">
                        {DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-foreground">
                        {doc.documentNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {doc.expiryDate ? (
                          <div className="flex items-center gap-1.5">
                            <span>{doc.expiryDate}</span>
                            {expiryConfig && (
                              <Badge variant={expiryConfig.variant} className="text-[10px] py-0 px-1.5">
                                {expiryConfig.label}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={verConfig.variant} className="text-xs">
                          {verConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatFileSize(doc.fileSize)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Download Button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-foreground hover:text-primary"
                            onClick={() => handleDownload(doc)}
                            disabled={downloadingId === doc.id}
                            title="Download document"
                          >
                            {downloadingId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>

                          {/* Verification Buttons for ADMIN & HR */}
                          {canManage && (
                            <>
                              {doc.verificationStatus !== "VERIFIED" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => handleVerificationChange(doc, "VERIFIED")}
                                  disabled={verifyingId === doc.id}
                                  title="Mark as Verified"
                                >
                                  {verifyingId === doc.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}

                              {doc.verificationStatus !== "REJECTED" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={() => handleVerificationChange(doc, "REJECTED")}
                                  disabled={verifyingId === doc.id}
                                  title="Mark as Rejected"
                                >
                                  {verifyingId === doc.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <XCircle className="h-4 w-4" />
                                  )}
                                </Button>
                              )}

                              {/* Delete Button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(doc)}
                                disabled={deletingId === doc.id}
                                title="Delete document"
                              >
                                {deletingId === doc.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {documents.map((doc) => {
              const verConfig =
                DOCUMENT_VERIFICATION_CONFIG[doc.verificationStatus] || {
                  label: doc.verificationStatus,
                  variant: "secondary" as const,
                };
              const expiryConfig = doc.status
                ? DOCUMENT_STATUS_CONFIG[doc.status]
                : null;

              return (
                <Card key={doc.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-medium text-sm text-foreground truncate">
                        {doc.originalFileName}
                      </span>
                    </div>
                    <Badge variant={verConfig.variant} className="text-xs shrink-0">
                      {verConfig.label}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-y py-2">
                    <div>
                      <span className="block font-medium text-foreground">Type</span>
                      <span>{DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}</span>
                    </div>
                    <div>
                      <span className="block font-medium text-foreground">Size</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                    </div>
                    {doc.documentNumber && (
                      <div className="col-span-2">
                        <span className="block font-medium text-foreground">Number</span>
                        <span className="font-mono">{doc.documentNumber}</span>
                      </div>
                    )}
                    {doc.expiryDate && (
                      <div className="col-span-2 flex items-center gap-2">
                        <span className="font-medium text-foreground">Expiry:</span>
                        <span>{doc.expiryDate}</span>
                        {expiryConfig && (
                          <Badge variant={expiryConfig.variant} className="text-[10px] py-0 px-1.5">
                            {expiryConfig.label}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                      >
                        {downloadingId === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        <span>Download</span>
                      </Button>

                      {canManage && (
                        <>
                          {doc.verificationStatus !== "VERIFIED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-emerald-600 hover:bg-emerald-50 px-2"
                              onClick={() => handleVerificationChange(doc, "VERIFIED")}
                              disabled={verifyingId === doc.id}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-destructive hover:bg-destructive/10 px-2"
                            onClick={() => handleDelete(doc)}
                            disabled={deletingId === doc.id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Upload Dialog */}
      {isUploadOpen && (
        <UploadDocumentDialog
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          employeeId={employeeId}
        />
      )}
    </div>
  );
}
