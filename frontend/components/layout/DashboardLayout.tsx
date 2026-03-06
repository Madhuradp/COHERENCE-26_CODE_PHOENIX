"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  GitCompare,
  ClipboardList,
  BarChart3,
  Settings,
} from "lucide-react";
import { useAuth } from "@/lib/authContext";
import type { UserResponse } from "@/lib/api";

const clinicianNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/patients", icon: Users, label: "Patients" },
  { href: "/dashboard/trials", icon: FlaskConical, label: "Clinical Trials" },
  { href: "/dashboard/matching", icon: GitCompare, label: "Trial Matching" },
  { href: "/dashboard/results", icon: ClipboardList, label: "Match Results" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Recruitment Analytics" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

function getClinicianName(user: UserResponse | null): string {
  if (!user) return "Clinician";
  if (user.full_name) return user.full_name;
  if (user.researcher_profile?.full_name) return user.researcher_profile.full_name;
  if (user.pharma_profile?.company_name) return user.pharma_profile.company_name;
  return user.email.split("@")[0];
}

function getRoleLabel(user: UserResponse | null): string {
  if (!user) return "Clinician";
  const map: Record<string, string> = {
    DOCTOR: "Doctor",
    PHARMACEUTICAL_COMPANY: "Pharma Company",
    CLINICAL_RESEARCHER: "Researcher",
  };
  return map[user.role] || "Clinician";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  const displayName = getClinicianName(user);
  const roleLabel = getRoleLabel(user);
  const initials = getInitials(displayName);

  const clinicianUser = {
    initials,
    name: displayName,
    subtitle: roleLabel,
  };

  const clinicianNavbarUser = {
    name: displayName,
    role: roleLabel,
    initials,
    email: user?.email || "",
    settingsHref: "/dashboard/settings",
  };

  return (
    <div className="flex h-screen bg-surface-bg overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        navItems={clinicianNavItems}
        user={clinicianUser}
        rootPath="/dashboard"
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavbar
          onMobileMenuToggle={() => setMobileOpen(true)}
          user={clinicianNavbarUser}
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
