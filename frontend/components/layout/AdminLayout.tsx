"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import { useAuth } from "@/lib/authContext";
import type { UserResponse } from "@/lib/api";
import {
  LayoutDashboard,
  ScrollText,
  Scale,
  Activity,
  Users,
  FlaskConical,
  Settings,
} from "lucide-react";

const auditNavItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/audit-logs", icon: ScrollText, label: "Audit Logs" },
  { href: "/admin/fairness", icon: Scale, label: "Fairness Analytics" },
  { href: "/admin/monitoring", icon: Activity, label: "System Monitoring" },
  { href: "/admin/users", icon: Users, label: "User Management" },
  { href: "/admin/trials", icon: FlaskConical, label: "Trial Management" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

function getAuditorName(user: UserResponse | null): string {
  if (!user) return "Auditor";
  if (user.auditor_profile?.full_name) return user.auditor_profile.full_name;
  return user.email.split("@")[0];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  const displayName = getAuditorName(user);
  const initials = getInitials(displayName);

  const auditSidebarUser = {
    initials,
    name: displayName,
    subtitle: "Auditor",
  };

  const auditNavbarUser = {
    name: displayName,
    role: "Auditor",
    initials,
    email: user?.email || "",
    settingsHref: "/admin/settings",
  };

  const auditNotifications = [
    { id: 1, text: "Failed login attempt from 203.45.11.9", time: "35 min ago", unread: true },
    { id: 2, text: "Database replica latency spike detected", time: "2h ago", unread: true },
    { id: 3, text: "Trial TRL_T310 submitted for ethics review", time: "3h ago", unread: false },
  ];

  return (
    <div className="flex h-screen bg-surface-bg overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        navItems={auditNavItems}
        user={auditSidebarUser}
        rootPath="/admin"
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavbar
          onMobileMenuToggle={() => setMobileOpen(true)}
          user={auditNavbarUser}
          notifications={auditNotifications}
          searchPlaceholder="Search users, trials, logs..."
        />

        <AnimatePresence mode="wait">
          <motion.main
            key="content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-thin"
          >
            {children}
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  );
}
