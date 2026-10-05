import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from "../../../shared/types/document";
import { useUploadDocument } from "../../hooks/use-documents";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Upload,
  AlertCircle,
  FileText,
  X,
  Loader2,
  CheckCircle,
} from "lucide-react";

interface UploadDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
}

export function UploadDocumentDialog({
  isOpen,
  onClose,
  employeeId,
}: UploadDocumentDialogProps) {
  const [documentType, setDocumentType] = useState<DocumentType>(DOCUMENT_TYPES.PASSPORT);
  const [documentNumber, setDocumentNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadDocument(employeeId);

  if (!isOpen) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit.");
      return;
    }

    // Validate extension / type
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    const extension = file.name.split(".").pop()?.toLowerCase();
    const validExts = ["pdf", "jpg", "jpeg", "png"];

    if (!allowed.includes(file.type) && !validExts.includes(extension || "")) {
      setError("Only PDF, JPEG, and PNG files are allowed.");
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError("Please select a document file to upload.");
      return;
    }

    if (issueDate && expiryDate) {
      if (new Date(expiryDate).getTime() < new Date(issueDate).getTime()) {
        setError("Expiry date must not be before issue date.");
        return;
      }
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("documentType", documentType);
    if (documentNumber.trim()) {
      formData.append("documentNumber", documentNumber.trim());
    }
    if (issueDate.trim()) {
      formData.append("issueDate", issueDate.trim());
    }
    if (expiryDate.trim()) {
      formData.append("expiryDate", expiryDate.trim());
    }

    try {
      await uploadMutation.mutateAsync(formData);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload document";
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-xl bg-background border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Upload Document to Vault
              </h2>
              <p className="text-xs text-muted-foreground">
                Upload secure files to Cloudflare R2 storage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Document Type */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Document Type <span className="text-destructive">*</span>
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Document Number */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Document Number
            </label>
            <Input
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="e.g. N1234567, 101/2026/..."
            />
          </div>

          {/* Issue & Expiry Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Issue Date
              </label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Expiry Date
              </label>
              <Input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          {/* File Upload Box */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              File <span className="text-destructive">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
                selectedFile
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-muted/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFile ? (
                <div className="flex items-center gap-3 text-sm">
                  <FileText className="h-6 w-6 text-primary shrink-0" />
                  <div className="text-left overflow-hidden">
                    <p className="font-medium text-foreground truncate max-w-[280px]">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 ml-2" />
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">
                    Click to select a document file
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPEG, or PNG up to 10MB
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Dialog Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={uploadMutation.isPending || !selectedFile}
              className="gap-2"
            >
              {uploadMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <span>{uploadMutation.isPending ? "Uploading..." : "Upload Document"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
