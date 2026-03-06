"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { TopNavbar } from "./TopNavbar";
import {
  LayoutDashboard,
  HeartPulse,
  GitCompare,
  Send,
  History,
  Settings,
} from "lucide-react";

const patientNavItems = [
  { href: "/patient", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/patient/health-records", icon: HeartPulse, label: "Health Records" },
  { href: "/patient/matches", icon: GitCompare, label: "Trial Matches" },
  { href: "/patient/applications", icon: Send, label: "My Applications" },
  { href: "/patient/history", icon: History, label: "Match History" },
  { href: "/patient/settings", icon: Settings, label: "Settings" },
];

const patientSidebarUser = {
  initials: "RS",
  name: "Rahul Sharma",
  subtitle: "Patient",
};

const patientNavbarUser = {
  name: "Rahul Sharma",
  role: "Patient",
  initials: "RS",
  email: "rahul@email.com",
  settingsHref: "/patient/settings",
};

const patientNotifications = [
  { id: 1, text: "Your eligibility check is complete — 3 matches found", time: "5 min ago", unread: true },
  { id: 2, text: "Diabetes Drug Study: Application received", time: "2h ago", unread: true },
  { id: 3, text: "New trial in Mumbai matching your profile", time: "Yesterday", unread: false },
];

export function PatientLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface-bg overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        navItems={patientNavItems}
        user={patientSidebarUser}
        rootPath="/patient"
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavbar
          onMobileMenuToggle={() => setMobileOpen(true)}
          user={patientNavbarUser}
          notifications={patientNotifications}
          searchPlaceholder="Search trials, conditions..."
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
