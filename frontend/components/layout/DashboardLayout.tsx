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

const clinicianNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/patients", icon: Users, label: "Patients" },
  { href: "/dashboard/trials", icon: FlaskConical, label: "Clinical Trials" },
  { href: "/dashboard/matching", icon: GitCompare, label: "Trial Matching" },
  { href: "/dashboard/results", icon: ClipboardList, label: "Match Results" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Recruitment Analytics" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

const clinicianUser = {
  initials: "SC",
  name: "Dr. Sarah Chen",
  subtitle: "Oncologist · AIIMS",
};

const clinicianNavbarUser = {
  name: "Dr. Sarah Chen",
  role: "Doctor",
  initials: "SC",
  email: "sarah@aiims.edu",
  settingsHref: "/dashboard/settings",
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
