"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/config/supabase";
import {
  UserPlus,
  Shield,
  ShieldCheck,
  Pencil,
  KeyRound,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Eye,
  EyeOff,
  Crown,
  User as UserIcon,
} from "lucide-react";

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  created_at?: string;
}

type StatusMessage = {
  type: "success" | "error" | "warning";
  text: string;
};

export default function UserManagement() {
  const { user } = useAuth();

  // Users list state
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Add user form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "member">("member");
  const [addingUser, setAddingUser] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Edit modal state
  const [editUser, setEditUser] = useState<ManagedUser | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "member">("member");
  const [editPassword, setEditPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  // Status messages
  const [addStatus, setAddStatus] = useState<StatusMessage | null>(null);
  const [editStatus, setEditStatus] = useState<StatusMessage | null>(null);

  // Access guard
  const isAdmin = user?.role === "admin";

  // Fetch all users
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      setUsers(
        (data || []).map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role || "member",
          created_at: u.created_at,
        }))
      );
    } catch (e) {
      console.error("Failed to fetch users:", e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin, fetchUsers]);

  // Add new user handler
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;
    setAddingUser(true);
    setAddStatus(null);

    try {
      // 1. Create auth user via Supabase Auth signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: { name: newName || newEmail.split("@")[0] },
        },
      });

      if (authError) {
        setAddStatus({ type: "error", text: authError.message });
        return;
      }

      if (!authData.user) {
        setAddStatus({
          type: "error",
          text: "Failed to create auth user. Try again.",
        });
        return;
      }

      // 2. Insert profile into public.users table
      const { error: profileError } = await supabase.from("users").insert([
        {
          id: authData.user.id,
          email: newEmail,
          name: newName || newEmail.split("@")[0],
          role: newRole,
        },
      ]);

      if (profileError) {
        // Profile might already exist if signUp triggers a DB function
        if (profileError.code === "23505") {
          // Duplicate key — update the role instead
          await supabase
            .from("users")
            .update({ role: newRole, name: newName || newEmail.split("@")[0] })
            .eq("id", authData.user.id);
        } else {
          setAddStatus({
            type: "warning",
            text: `Auth user created, but profile insert failed: ${profileError.message}`,
          });
          return;
        }
      }

      setAddStatus({
        type: "success",
        text: `User "${newName || newEmail}" created successfully as ${newRole}.`,
      });

      // Reset form
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      setNewRole("member");
      setShowNewPassword(false);
      fetchUsers();

      // Auto-close form after success
      setTimeout(() => {
        setShowAddForm(false);
        setAddStatus(null);
      }, 2000);
    } catch (e: any) {
      setAddStatus({
        type: "error",
        text: e.message || "An unexpected error occurred.",
      });
    } finally {
      setAddingUser(false);
    }
  };

  // Open edit modal
  const openEditModal = (u: ManagedUser) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditPassword("");
    setShowEditPassword(false);
    setEditStatus(null);
  };

  // Save edit (role change + optional password reset)
  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSavingEdit(true);
    setEditStatus(null);

    try {
      // 1. Update role in public.users
      const { error: roleError } = await supabase
        .from("users")
        .update({ role: editRole })
        .eq("id", editUser.id);

      if (roleError) {
        setEditStatus({
          type: "error",
          text: `Role update failed: ${roleError.message}`,
        });
        return;
      }

      // 2. If password provided, update via Supabase Auth admin (requires service role)
      // For client-side, we use a workaround: store a password reset flag
      // In production, you'd call an Edge Function with service_role key
      if (editPassword.trim()) {
        // Client-side limitation: can only update OWN password via supabase.auth.updateUser
        // For other users, we need a server-side function.
        // We'll show a note about this limitation.
        if (editUser.id === user?.id) {
          const { error: pwError } = await supabase.auth.updateUser({
            password: editPassword,
          });
          if (pwError) {
            setEditStatus({
              type: "warning",
              text: `Role updated, but password change failed: ${pwError.message}`,
            });
            fetchUsers();
            return;
          }
        } else {
          // For other users, we cannot change password from client-side with anon key
          // Show success for role but note about password
          setEditStatus({
            type: "warning",
            text: `Role updated to "${editRole}". Password reset for other users requires a server-side Edge Function. Please ask the user to reset their password via the login page.`,
          });
          fetchUsers();
          setTimeout(() => {
            setEditUser(null);
            setEditStatus(null);
          }, 3500);
          return;
        }
      }

      setEditStatus({
        type: "success",
        text: `User "${editUser.name}" updated successfully.`,
      });
      fetchUsers();

      setTimeout(() => {
        setEditUser(null);
        setEditStatus(null);
      }, 1500);
    } catch (e: any) {
      setEditStatus({
        type: "error",
        text: e.message || "An unexpected error occurred.",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // Non-admin guard
  if (!isAdmin) {
    return (
      <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardContent className="py-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center">
              <Shield className="h-7 w-7 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Access Restricted</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              User management is only available to administrators. Contact your admin to request access.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Users className="h-4.5 w-4.5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  User Management
                </CardTitle>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {users.length} team member{users.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setAddStatus(null);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold px-4 h-9 shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Add User
            </Button>
          </div>
        </CardHeader>

        {/* Add User Form */}
        {showAddForm && (
          <div className="border-b border-gray-100 bg-indigo-50/30 animate-fade-in">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-6 w-6 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <UserPlus className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-gray-900">Create New User</h3>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">
                      Full Name
                    </Label>
                    <Input
                      id="add-user-name"
                      placeholder="John Doe"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="rounded-xl h-10 bg-white border-gray-200 focus-visible:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">
                      Email Address <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      id="add-user-email"
                      type="email"
                      placeholder="user@example.com"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="rounded-xl h-10 bg-white border-gray-200 focus-visible:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">
                      Password <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="add-user-password"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Min 6 characters"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="rounded-xl h-10 bg-white border-gray-200 focus-visible:ring-indigo-500/20 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-gray-600">
                      Role
                    </Label>
                    <Select
                      value={newRole}
                      onValueChange={(v) => setNewRole(v as "admin" | "member")}
                    >
                      <SelectTrigger
                        id="add-user-role"
                        className="rounded-xl h-10 bg-white border-gray-200"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">
                          <span className="flex items-center gap-2">
                            <UserIcon className="h-3.5 w-3.5 text-gray-500" />
                            Member
                          </span>
                        </SelectItem>
                        <SelectItem value="admin">
                          <span className="flex items-center gap-2">
                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                            Admin
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Status message */}
                {addStatus && (
                  <div
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium animate-fade-in ${
                      addStatus.type === "success"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        : addStatus.type === "warning"
                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                        : "bg-red-50 text-red-700 border border-red-100"
                    }`}
                  >
                    {addStatus.type === "success" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    ) : addStatus.type === "warning" ? (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 shrink-0" />
                    )}
                    {addStatus.text}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="submit"
                    disabled={addingUser || !newEmail || !newPassword}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold px-5 h-9 shadow-sm disabled:opacity-50 transition-all duration-200"
                  >
                    {addingUser ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                        Create User
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setAddStatus(null);
                    }}
                    className="rounded-xl text-xs font-semibold h-9 border-gray-200 text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users Table */}
        <CardContent className="p-0">
          {loadingUsers ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Loading users...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-12 w-12 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-400">No team members yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-gray-100">
                  <TableHead className="pl-5 text-gray-400">User</TableHead>
                  <TableHead className="text-gray-400">Email</TableHead>
                  <TableHead className="text-gray-400">Role</TableHead>
                  <TableHead className="text-gray-400">Joined</TableHead>
                  <TableHead className="text-right pr-5 text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow
                    key={u.id}
                    className="group border-gray-50 hover:bg-gray-50/60 transition-colors"
                  >
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 shadow-sm border border-gray-100">
                          <AvatarFallback
                            className={`text-xs font-bold ${
                              u.role === "admin"
                                ? "bg-indigo-50 text-indigo-700"
                                : "bg-gray-50 text-gray-700"
                            }`}
                          >
                            {u.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-tight">
                            {u.name}
                            {u.id === user?.id && (
                              <span className="ml-1.5 text-[10px] font-semibold text-indigo-400">
                                (You)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500 font-medium">{u.email}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`capitalize text-[10px] font-bold tracking-wider border-0 ${
                          u.role === "admin"
                            ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {u.role === "admin" ? (
                          <ShieldCheck className="h-3 w-3 mr-1" />
                        ) : (
                          <UserIcon className="h-3 w-3 mr-1" />
                        )}
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-400 font-medium">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(u)}
                        className="opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-xl text-xs font-semibold h-8 px-3 border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Pencil className="h-4 w-4 text-indigo-600" />
              </div>
              Edit User
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Update role or password for{" "}
              <span className="font-semibold text-gray-600">
                {editUser?.name}
              </span>
            </DialogDescription>
          </DialogHeader>

          {editUser && (
            <div className="space-y-5 pt-2">
              {/* User info header */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <Avatar className="h-10 w-10 shadow-sm border border-gray-100">
                  <AvatarFallback
                    className={`text-xs font-bold ${
                      editUser.role === "admin"
                        ? "bg-indigo-50 text-indigo-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {editUser.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-gray-900">{editUser.name}</p>
                  <p className="text-xs text-gray-500">{editUser.email}</p>
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-gray-400" />
                  Role
                </Label>
                <Select
                  value={editRole}
                  onValueChange={(v) => setEditRole(v as "admin" | "member")}
                >
                  <SelectTrigger
                    id="edit-user-role"
                    className="rounded-xl h-10 bg-white border-gray-200"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      <span className="flex items-center gap-2">
                        <UserIcon className="h-3.5 w-3.5 text-gray-500" />
                        Member
                      </span>
                    </SelectItem>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-2">
                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                        Admin
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-gray-400" />
                  New Password
                  <span className="text-[10px] text-gray-400 font-normal ml-1">
                    (leave blank to keep current)
                  </span>
                </Label>
                <div className="relative">
                  <Input
                    id="edit-user-password"
                    type={showEditPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    minLength={6}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="rounded-xl h-10 bg-white border-gray-200 focus-visible:ring-indigo-500/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showEditPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Status message */}
              {editStatus && (
                <div
                  className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs font-medium animate-fade-in ${
                    editStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : editStatus.type === "warning"
                      ? "bg-amber-50 text-amber-700 border border-amber-100"
                      : "bg-red-50 text-red-700 border border-red-100"
                  }`}
                >
                  {editStatus.type === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  ) : editStatus.type === "warning" ? (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  )}
                  <span>{editStatus.text}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setEditUser(null)}
              className="rounded-xl text-xs font-semibold h-9 border-gray-200 text-gray-600"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={savingEdit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold px-5 h-9 shadow-sm disabled:opacity-50 transition-all duration-200"
            >
              {savingEdit ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
