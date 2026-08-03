import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PanelCard } from "@/components/dashboard/panel-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  adminAssignRole,
  adminSetRolePermission,
  adminSetUserPermission,
  listAdminMembers,
  listStaff,
} from "@/lib/admin.functions";
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  ROLE_KEYS,
  ROLE_LABELS,
  type PermissionKey,
  type RoleKey,
} from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated/console-x7q9f4k2m8/staff")({
  component: AdminStaff,
});

function AdminStaff() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");

  const fetchStaff = useServerFn(listStaff);
  const fetchMembers = useServerFn(listAdminMembers);
  const assignRole = useServerFn(adminAssignRole);
  const setRolePermission = useServerFn(adminSetRolePermission);
  const setUserPermission = useServerFn(adminSetUserPermission);

  const { data } = useQuery({ queryKey: ["admin-staff"], queryFn: () => fetchStaff() });
  const { data: candidates } = useQuery({
    queryKey: ["admin-staff-search", term],
    queryFn: () => fetchMembers({ data: { search: term } }),
    enabled: term.length > 1,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-staff"] });

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; role: RoleKey; enabled: boolean }) =>
      assignRole({ data: vars }),
    onSuccess: () => {
      toast.success("Role updated");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rolePermMutation = useMutation({
    mutationFn: (vars: { role: RoleKey; key: string; granted: boolean }) =>
      setRolePermission({ data: vars }),
    onSuccess: () => {
      toast.success("Permission updated");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const userPermMutation = useMutation({
    mutationFn: (vars: { userId: string; key: string; granted: boolean }) =>
      setUserPermission({ data: vars }),
    onSuccess: () => {
      toast.success("Permission override saved");
      void refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function rolePermValue(role: RoleKey, key: PermissionKey) {
    return (data?.rolePermissions ?? []).some(
      (row) => row.role === role && row.permission_key === key && row.granted,
    );
  }

  function overrideValue(userId: string, key: PermissionKey) {
    const row = (data?.overrides ?? []).find(
      (item) => item.user_id === userId && item.permission_key === key,
    );
    return row?.granted;
  }

  return (
    <div className="space-y-6">
      <PanelCard title="Staff members" description="Assign roles and per-person permission overrides.">
        <div className="space-y-4">
          {data?.staff.map((person) => (
            <div key={person.userId} className="rounded-xl border border-border bg-card p-5">
              <p className="font-semibold">{person.fullName}</p>
              <p className="text-sm text-muted-foreground">{person.email}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                {ROLE_KEYS.map((role) => (
                  <Button
                    key={role}
                    size="sm"
                    variant={person.roles.includes(role) ? "prime" : "outline"}
                    onClick={() =>
                      roleMutation.mutate({
                        userId: person.userId,
                        role,
                        enabled: !person.roles.includes(role),
                      })
                    }
                  >
                    {ROLE_LABELS[role]}
                  </Button>
                ))}
              </div>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-primary">
                  Permission overrides
                </summary>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {PERMISSION_KEYS.map((key) => {
                    const override = overrideValue(person.userId, key);
                    const effective =
                      override ?? person.roles.some((role) => rolePermValue(role as RoleKey, key));
                    return (
                      <label
                        key={key}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm"
                      >
                        <span>
                          {PERMISSION_LABELS[key]}
                          {override !== undefined && (
                            <span className="ml-2 text-[10px] uppercase text-primary">override</span>
                          )}
                        </span>
                        <Switch
                          checked={Boolean(effective)}
                          onCheckedChange={(checked) =>
                            userPermMutation.mutate({
                              userId: person.userId,
                              key,
                              granted: checked,
                            })
                          }
                        />
                      </label>
                    );
                  })}
                </div>
              </details>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="Add staff" description="Search a member and grant them a role.">
        <form
          className="flex gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setTerm(search);
          }}
        >
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search members by name or email"
          />
          <Button type="submit" variant="prime">
            Search
          </Button>
        </form>

        <div className="mt-4 space-y-2">
          {candidates?.map((candidate) => (
            <div
              key={candidate.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
            >
              <div>
                <p className="font-semibold">{candidate.fullName}</p>
                <p className="text-xs text-muted-foreground">{candidate.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ROLE_KEYS.map((role) => (
                  <Button
                    key={role}
                    size="sm"
                    variant="outline"
                    onClick={() => roleMutation.mutate({ userId: candidate.id, role, enabled: true })}
                  >
                    + {ROLE_LABELS[role]}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard
        title="Role permission matrix"
        description="Super Administrators can reconfigure what each role may do."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {ROLE_KEYS.filter((role) => role !== "super_admin").map((role) => (
            <div key={role} className="rounded-xl border border-border p-4">
              <p className="font-semibold">{ROLE_LABELS[role]}</p>
              <div className="mt-3 space-y-2">
                {PERMISSION_KEYS.map((key) => (
                  <label key={key} className="flex items-center justify-between gap-3 text-sm">
                    <span>{PERMISSION_LABELS[key]}</span>
                    <Switch
                      checked={rolePermValue(role, key)}
                      onCheckedChange={(checked) =>
                        rolePermMutation.mutate({ role, key, granted: checked })
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
