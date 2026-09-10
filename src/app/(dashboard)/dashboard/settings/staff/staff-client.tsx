"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  inviteStaffAction,
  updateStaffRoleAction,
  toggleStaffActiveAction,
} from "@/modules/staff/actions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, UserCheck, UserX, Shield, AlertCircle, Loader2 } from "lucide-react";

export interface StaffListItem {
  id: string;
  userId: string;
  email: string;
  fullName: string | null;
  roleId: string;
  roleName: string;
  storeId: string | null;
  storeName: string | null;
  isActive: boolean;
}

export interface RoleOption {
  id: string;
  name: string;
  description: string | null;
}

interface StaffClientProps {
  currentUserId: string;
  isOwner: boolean;
  staffMembers: StaffListItem[];
  availableRoles: RoleOption[];
}

export function StaffClient({
  currentUserId,
  isOwner,
  staffMembers,
  availableRoles,
}: StaffClientProps) {
  const router = useRouter();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState(availableRoles[0]?.id || "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      const result = await inviteStaffAction({
        email: inviteEmail,
        roleId: selectedRoleId,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Failed to invite staff");
        return;
      }

      setInviteDialogOpen(false);
      setInviteEmail("");
      router.refresh();
    });
  };

  const handleRoleChange = (staffId: string, newRoleId: string) => {
    startTransition(async () => {
      const result = await updateStaffRoleAction(staffId, newRoleId);
      if (!result.success) {
        alert(result.error || "Failed to update role");
        return;
      }
      router.refresh();
    });
  };

  const handleToggleActive = (staffId: string, currentStatus: boolean) => {
    startTransition(async () => {
      const result = await toggleStaffActiveAction(staffId, !currentStatus);
      if (!result.success) {
        alert(result.error || "Failed to update status");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <Alert variant="destructive" className="border-rose-900/50 bg-rose-950/50 text-rose-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Staff Directory Table */}
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-bold text-white">Team Members</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Manage organization staff, roles, and granular module permissions
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setInviteDialogOpen(true)}
            className="h-8 gap-1.5 bg-emerald-500 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite Staff Member
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Assigned Role</TableHead>
                <TableHead>Store Scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers.map((member) => {
                const isSelf = member.userId === currentUserId;

                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-white text-xs">
                          {member.fullName || member.email.split("@")[0]}
                          {isSelf && (
                            <span className="ml-1.5 text-[10px] text-emerald-400 font-normal">
                              (You)
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {member.email}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {isSelf || member.roleName === "OWNER" ? (
                        <Badge
                          variant="outline"
                          className="border-indigo-500/30 bg-indigo-950/40 text-indigo-300 text-[10px]"
                        >
                          <Shield className="mr-1 h-3 w-3" />
                          {member.roleName}
                        </Badge>
                      ) : (
                        <select
                          value={member.roleId}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          disabled={isPending}
                          className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {availableRoles
                            .filter((r) => r.name !== "OWNER" || isOwner)
                            .map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                        </select>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="text-[11px] text-slate-300">
                        {member.storeName ? member.storeName : "Organization-wide (All Stores)"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          member.isActive
                            ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-[10px]"
                            : "border-rose-500/30 bg-rose-950/40 text-rose-300 text-[10px]"
                        }
                      >
                        {member.isActive ? "Active" : "Deactivated"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      {!isSelf && member.roleName !== "OWNER" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleToggleActive(member.id, member.isActive)}
                          className={
                            member.isActive
                              ? "h-7 px-2 text-[11px] text-rose-400 hover:bg-rose-950/40"
                              : "h-7 px-2 text-[11px] text-emerald-400 hover:bg-emerald-950/40"
                          }
                        >
                          {member.isActive ? (
                            <>
                              <UserX className="mr-1 h-3 w-3" /> Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-1 h-3 w-3" /> Reactivate
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Staff Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="border-slate-800 bg-slate-900 text-slate-100 sm:max-w-md">
          <form onSubmit={handleInvite}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white">Invite Team Member</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Grant role-based access to catalog, orders, and store operations.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="inviteEmail" className="text-xs text-slate-300">
                  Email Address
                </Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  disabled={isPending}
                  className="border-slate-800 bg-slate-950 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="selectedRole" className="text-xs text-slate-300">
                  Role Assignment
                </Label>
                <select
                  id="selectedRole"
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  disabled={isPending}
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {availableRoles
                    .filter((r) => r.name !== "OWNER" || isOwner)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} — {r.description}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInviteDialogOpen(false)}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending || !inviteEmail}
                className="bg-emerald-500 text-xs font-semibold text-slate-950 hover:bg-emerald-400"
              >
                {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
