"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, MoreHorizontal, ShieldCheck,
  ShieldOff, Trash2, Mail, CheckCircle, UserCheck, UserX,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { listClinicians, type UserResponse } from "@/lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const roleColors: Record<string, "purple" | "blue" | "green" | "orange" | "gray"> = {
  RESEARCHER: "green",
  AUDITOR: "purple",
};

// Extract display name from either top-level or nested profile
function getDisplayName(user: UserResponse & { full_name?: string }): string {
  return (
    user.full_name ||
    user.researcher_profile?.full_name ||
    user.auditor_profile?.full_name ||
    user.email.split("@")[0]
  );
}

// Extract organization from either top-level or nested profile
function getOrganization(user: UserResponse & { organization?: string }): string {
  return (
    user.organization ||
    user.researcher_profile?.institution ||
    user.auditor_profile?.organization ||
    "—"
  );
}

// Get initials for avatar
function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0] || "").join("").slice(0, 2).toUpperCase() || "??";
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<(UserResponse & { full_name?: string; organization?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    listClinicians()
      .then((res) => setUsers(res.data as any))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const allRoles = ["All", ...Array.from(new Set(users.map((u) => u.role)))];

  const filtered = users.filter((u) => {
    const s = search.toLowerCase();
    const name = getDisplayName(u).toLowerCase();
    const org = getOrganization(u).toLowerCase();
    const matchSearch =
      name.includes(s) ||
      u.email.toLowerCase().includes(s) ||
      org.includes(s) ||
      u.role.toLowerCase().includes(s);
    const matchRole = roleFilter === "All" || u.role === roleFilter;
    const matchStatus =
      statusFilter === "All" ||
      (statusFilter === "Active" && u.is_active) ||
      (statusFilter === "Inactive" && !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;
  const researcherCount = users.filter((u) => u.role === "RESEARCHER").length;
  const auditorCount = users.filter((u) => u.role === "AUDITOR").length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Users size={22} className="text-brand-purple" /> User Management
        </h1>
        <p className="text-sm text-text-muted mt-0.5">All registered researchers and auditors in the system</p>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={loading ? "—" : String(users.length)}
          icon={<Users size={18} className="text-brand-purple" />}
          iconBg="bg-brand-purple-light"
          subtitle="Registered accounts"
        />
        <StatCard
          title="Active"
          value={loading ? "—" : String(activeCount)}
          icon={<UserCheck size={18} className="text-emerald-500" />}
          iconBg="bg-emerald-100"
          subtitle="Currently enabled"
        />
        <StatCard
          title="Researchers"
          value={loading ? "—" : String(researcherCount)}
          icon={<CheckCircle size={18} className="text-blue-500" />}
          iconBg="bg-blue-50"
          subtitle="RESEARCHER role"
        />
        <StatCard
          title="Auditors"
          value={loading ? "—" : String(auditorCount)}
          icon={<ShieldCheck size={18} className="text-orange-500" />}
          iconBg="bg-orange-50"
          subtitle="AUDITOR role"
        />
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name, email or organization..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field w-full sm:w-44"
            >
              {allRoles.map((r) => <option key={r}>{r}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-full sm:w-36"
            >
              {["All", "Active", "Inactive"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <p className="text-xs text-text-muted mt-3">
            {loading ? "Loading..." : `${filtered.length} of ${users.length} users`}
          </p>
        </Card>
      </motion.div>

      {/* Users table */}
      <motion.div variants={itemVariants}>
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/40">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Organization</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Email Verified</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Joined</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Last Login</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="px-5 py-3">
                        <div className="h-8 rounded-lg bg-surface-muted animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-text-muted">
                      No users match your filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((user) => {
                    const name = getDisplayName(user);
                    const org = getOrganization(user);
                    return (
                      <tr
                        key={user.email}
                        className="border-b border-surface-border last:border-0 hover:bg-surface-muted/30 transition-colors"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-purple to-blue-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {getInitials(name)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-text-primary">{name}</p>
                              <p className="text-xs text-text-muted">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={roleColors[user.role] ?? "gray"}>{user.role}</Badge>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-text-secondary">{org}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={user.is_active ? "green" : "red"}>
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={user.is_email_verified ? "green" : "orange"}>
                            {user.is_email_verified ? "Verified" : "Pending"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-text-muted">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-xs text-text-muted">
                          {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
                        </td>
                        <td className="px-5 py-3.5 relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === user.email ? null : user.email)}
                            className="p-1.5 rounded-lg hover:bg-surface-muted transition-colors text-text-muted"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          <AnimatePresence>
                            {openMenuId === user.email && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 4 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 4 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute right-4 top-full mt-1 w-44 bg-white rounded-xl shadow-glass border border-surface-border z-50 overflow-hidden"
                                >
                                  <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-text-secondary hover:bg-surface-muted transition-colors">
                                    <Mail size={13} /> Send Email
                                  </button>
                                  {user.is_active ? (
                                    <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-orange-500 hover:bg-orange-50 transition-colors">
                                      <ShieldOff size={13} /> Suspend User
                                    </button>
                                  ) : (
                                    <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-emerald-600 hover:bg-emerald-50 transition-colors">
                                      <ShieldCheck size={13} /> Reactivate
                                    </button>
                                  )}
                                  <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
                                    <Trash2 size={13} /> Delete User
                                  </button>
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Role breakdown card */}
      {!loading && users.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <h2 className="font-semibold text-text-primary mb-4">Role Breakdown</h2>
            <div className="flex flex-col gap-3">
              {allRoles.filter((r) => r !== "All").map((role) => {
                const count = users.filter((u) => u.role === role).length;
                const pct = Math.round((count / users.length) * 100);
                const color = roleColors[role] === "green" ? "#22C55E" : roleColors[role] === "purple" ? "#7C3AED" : "#9CA3AF";
                return (
                  <div key={role}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-text-primary">{role}</span>
                      <span className="text-xs text-text-muted">{count} users ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
