import React, { useState } from "react";
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  Edit2,
  UserCheck,
  UserX,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  Lock,
} from "lucide-react";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useResetPassword,
  useDisableUser,
  useEnableUser,
} from "../../hooks/use-users";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ROLES } from "../../../shared/constants/roles";
import type { SafeUser } from "../../../shared/types/auth";

export const UsersPage: React.FC = () => {
  const { data: users = [], isLoading, error: fetchError } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const resetPassword = useResetPassword();
  const disableUser = useDisableUser();
  const enableUser = useEnableUser();

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [resettingUser, setResettingUser] = useState<SafeUser | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const activeHrCount = users.filter((u) => u.role === ROLES.HR && u.isActive).length;
  const isHrCapReached = activeHrCount >= 2;

  const handleOpenCreate = () => {
    setFormError(null);
    setFormSuccess(null);
    setFullName("");
    setEmail("");
    setPassword("");
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (user: SafeUser) => {
    setFormError(null);
    setFormSuccess(null);
    setEditingUser(user);
    setFullName(user.fullName);
    setEmail(user.email);
  };

  const handleOpenResetPassword = (user: SafeUser) => {
    setFormError(null);
    setFormSuccess(null);
    setResettingUser(user);
    setPassword("");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setFormError("All fields are required.");
      return;
    }

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    try {
      await createUser.mutateAsync({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: ROLES.HR,
      });
      setIsCreateOpen(false);
      setFormSuccess("HR user created successfully.");
      setTimeout(() => setFormSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.message || "Failed to create user");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError(null);

    try {
      await updateUser.mutateAsync({
        id: editingUser.id,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
      });
      setEditingUser(null);
      setFormSuccess("User updated successfully.");
      setTimeout(() => setFormSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.message || "Failed to update user");
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    setFormError(null);

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    try {
      await resetPassword.mutateAsync({
        id: resettingUser.id,
        password,
      });
      setResettingUser(null);
      setFormSuccess(`Password reset successfully for ${resettingUser.fullName}.`);
      setTimeout(() => setFormSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.message || "Failed to reset password");
    }
  };

  const handleToggleActive = async (user: SafeUser) => {
    setFormError(null);
    try {
      if (user.isActive) {
        if (user.role === ROLES.ADMIN) {
          alert("The System Administrator account cannot be disabled.");
          return;
        }
        await disableUser.mutateAsync(user.id);
        setFormSuccess(`User ${user.fullName} has been disabled.`);
      } else {
        if (user.role === ROLES.HR && isHrCapReached) {
          alert("Maximum 2 active HR accounts allowed. Please disable an existing active HR user before activating another.");
          return;
        }
        await enableUser.mutateAsync(user.id);
        setFormSuccess(`User ${user.fullName} has been activated.`);
      }
      setTimeout(() => setFormSuccess(null), 4000);
    } catch (err: any) {
      alert(err.message || "Failed to update user status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            System login authorization: Exactly 1 Administrator and maximum 2 active HR accounts.
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          disabled={isHrCapReached}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add HR User</span>
        </Button>
      </div>

      {/* Quota Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Administrator Quota</p>
              <p className="text-xs text-muted-foreground">Fixed single system owner</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-foreground">1 / 1</span>
            <p className="text-xs text-emerald-600 font-medium">Fully Allocated</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Active HR Users Quota</p>
              <p className="text-xs text-muted-foreground">Maximum 2 concurrent active HR logins</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-foreground">{activeHrCount} / 2</span>
            <p className={`text-xs font-medium ${isHrCapReached ? "text-amber-600" : "text-emerald-600"}`}>
              {isHrCapReached ? "Capacity Reached" : `${2 - activeHrCount} Slots Available`}
            </p>
          </div>
        </div>
      </div>

      {formSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">Authorized System Users</h2>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : fetchError ? (
          <div className="p-6 text-center text-sm text-destructive">
            Failed to load users: {(fetchError as Error).message}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => {
                  const isAdmin = u.role === ROLES.ADMIN;
                  return (
                    <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-foreground">{u.fullName}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                            isAdmin
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-300"
                              : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                          }`}
                        >
                          {isAdmin ? <Shield className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.isActive
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                          {u.isActive ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(u)}
                            title="Edit user details"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenResetPassword(u)}
                            title="Reset password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          {!isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleActive(u)}
                              title={u.isActive ? "Disable account" : "Enable account"}
                              className={u.isActive ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"}
                            >
                              {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                          )}
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

      {/* Create HR User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-xl border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Add New HR User</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Login Email <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. hr2@hr-erp.local"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Initial Password <span className="text-destructive">*</span>
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create HR User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-xl border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Edit User</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Full Name</label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Login Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-xl border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Reset Password</h2>
              </div>
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Set a new password for <span className="font-semibold text-foreground">{resettingUser.fullName}</span> ({resettingUser.email}).
              </p>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  New Password <span className="text-destructive">*</span>
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResettingUser(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={resetPassword.isPending}>
                  {resetPassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Set Password
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
