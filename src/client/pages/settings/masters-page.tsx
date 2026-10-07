import React, { useState } from "react";
import {
  Database,
  Plus,
  Building,
  Briefcase,
  MapPin,
  FileText,
  Edit2,
  CheckCircle,
  XCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
} from "lucide-react";
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useActivateDepartment,
  useDeactivateDepartment,
  useDesignations,
  useCreateDesignation,
  useUpdateDesignation,
  useActivateDesignation,
  useDeactivateDesignation,
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useActivateBranch,
  useDeactivateBranch,
  useDocumentTypes,
  useCreateDocumentType,
  useUpdateDocumentType,
  useActivateDocumentType,
  useDeactivateDocumentType,
} from "../../hooks/use-masters";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

type MasterTab = "departments" | "designations" | "branches" | "document-types";

export const MastersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MasterTab>("departments");
  const [search, setSearch] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Queries (all records including inactive)
  const { data: departments = [], isLoading: loadingDepts } = useDepartments(true);
  const { data: designations = [], isLoading: loadingDesigs } = useDesignations(true);
  const { data: branches = [], isLoading: loadingBranches } = useBranches(true);
  const { data: docTypes = [], isLoading: loadingDocTypes } = useDocumentTypes(true);

  // Department Mutations
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const activateDept = useActivateDepartment();
  const deactivateDept = useDeactivateDepartment();

  // Designation Mutations
  const createDesig = useCreateDesignation();
  const updateDesig = useUpdateDesignation();
  const activateDesig = useActivateDesignation();
  const deactivateDesig = useDeactivateDesignation();

  // Branch Mutations
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const activateBranch = useActivateBranch();
  const deactivateBranch = useDeactivateBranch();

  // Document Type Mutations
  const createDocType = useCreateDocumentType();
  const updateDocType = useUpdateDocumentType();
  const activateDocType = useActivateDocumentType();
  const deactivateDocType = useDeactivateDocumentType();

  // Dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");

  const showSuccess = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setModalError(null);
    setName("");
    setCode("");
    setCity("");
    setCountry("");
    setDescription("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setModalError(null);
    setName(item.name || "");
    setCode(item.code || "");
    setCity(item.city || "");
    setCountry(item.country || "");
    setDescription(item.description || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!name.trim() || !code.trim()) {
      setModalError("Name and Code are required.");
      return;
    }

    try {
      if (activeTab === "departments") {
        if (editingItem) {
          await updateDept.mutateAsync({ id: editingItem.id, name: name.trim(), code: code.trim().toUpperCase() });
          showSuccess("Department updated successfully.");
        } else {
          await createDept.mutateAsync({ name: name.trim(), code: code.trim().toUpperCase() });
          showSuccess("Department created successfully.");
        }
      } else if (activeTab === "designations") {
        if (editingItem) {
          await updateDesig.mutateAsync({ id: editingItem.id, name: name.trim(), code: code.trim().toUpperCase() });
          showSuccess("Designation updated successfully.");
        } else {
          await createDesig.mutateAsync({ name: name.trim(), code: code.trim().toUpperCase() });
          showSuccess("Designation created successfully.");
        }
      } else if (activeTab === "branches") {
        if (editingItem) {
          await updateBranch.mutateAsync({
            id: editingItem.id,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            city: city.trim() || null,
            country: country.trim() || null,
          });
          showSuccess("Branch updated successfully.");
        } else {
          await createBranch.mutateAsync({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            city: city.trim() || null,
            country: country.trim() || null,
          });
          showSuccess("Branch created successfully.");
        }
      } else if (activeTab === "document-types") {
        if (editingItem) {
          await updateDocType.mutateAsync({
            id: editingItem.id,
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim() || null,
          });
          showSuccess("Document type updated successfully.");
        } else {
          await createDocType.mutateAsync({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim() || null,
          });
          showSuccess("Document type created successfully.");
        }
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.message || "Operation failed");
    }
  };

  const handleToggleStatus = async (item: any) => {
    try {
      const isCurrentlyActive = item.status === "active";
      if (activeTab === "departments") {
        if (isCurrentlyActive) await deactivateDept.mutateAsync(item.id);
        else await activateDept.mutateAsync(item.id);
      } else if (activeTab === "designations") {
        if (isCurrentlyActive) await deactivateDesig.mutateAsync(item.id);
        else await activateDesig.mutateAsync(item.id);
      } else if (activeTab === "branches") {
        if (isCurrentlyActive) await deactivateBranch.mutateAsync(item.id);
        else await activateBranch.mutateAsync(item.id);
      } else if (activeTab === "document-types") {
        if (isCurrentlyActive) await deactivateDocType.mutateAsync(item.id);
        else await activateDocType.mutateAsync(item.id);
      }
      showSuccess(`${item.name} has been ${isCurrentlyActive ? "deactivated" : "activated"}.`);
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const getFilteredItems = () => {
    let list: any[] = [];
    if (activeTab === "departments") list = departments;
    else if (activeTab === "designations") list = designations;
    else if (activeTab === "branches") list = branches;
    else if (activeTab === "document-types") list = docTypes;

    if (!search.trim()) return list;
    const q = search.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.city && item.city.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q))
    );
  };

  const filteredItems = getFilteredItems();
  const isLoading =
    (activeTab === "departments" && loadingDepts) ||
    (activeTab === "designations" && loadingDesigs) ||
    (activeTab === "branches" && loadingBranches) ||
    (activeTab === "document-types" && loadingDocTypes);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">System Master Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage organizational master tables and compliance document categories (Administrator only).
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Add {activeTab === "departments" ? "Department" : activeTab === "designations" ? "Designation" : activeTab === "branches" ? "Branch" : "Document Type"}</span>
        </Button>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b space-x-6 text-sm font-medium">
        <button
          onClick={() => { setActiveTab("departments"); setSearch(""); }}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "departments"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building className="h-4 w-4" />
          <span>Departments ({departments.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("designations"); setSearch(""); }}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "designations"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Designations ({designations.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("branches"); setSearch(""); }}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "branches"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <MapPin className="h-4 w-4" />
          <span>Branches ({branches.length})</span>
        </button>

        <button
          onClick={() => { setActiveTab("document-types"); setSearch(""); }}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === "document-types"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Document Types ({docTypes.length})</span>
        </button>
      </div>

      {/* Search / Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab.replace("-", " ")}...`}
            className="pl-9"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Code</th>
                  {activeTab === "branches" && <th className="px-6 py-3.5">Location</th>}
                  {activeTab === "document-types" && <th className="px-6 py-3.5">Description</th>}
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => {
                  const isActive = item.status === "active";
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{item.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{item.code}</td>
                      {activeTab === "branches" && (
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {[item.city, item.country].filter(Boolean).join(", ") || "—"}
                        </td>
                      )}
                      {activeTab === "document-types" && (
                        <td className="px-6 py-4 text-xs text-muted-foreground">
                          {item.description || "—"}
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            isActive
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            title="Edit record"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(item)}
                            title={isActive ? "Deactivate" : "Activate"}
                            className={isActive ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"}
                          >
                            {isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-xl border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">
                  {editingItem ? "Edit" : "Add"} {activeTab === "departments" ? "Department" : activeTab === "designations" ? "Designation" : activeTab === "branches" ? "Branch" : "Document Type"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Finance, Senior Developer"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Code <span className="text-destructive">*</span>
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. FIN, DEV-SR, HQ-01"
                  required
                />
              </div>

              {activeTab === "branches" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">City</label>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Dubai"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Country</label>
                    <Input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="e.g. United Arab Emirates"
                    />
                  </div>
                </>
              )}

              {activeTab === "document-types" && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Description</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Official government issued identity document"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
