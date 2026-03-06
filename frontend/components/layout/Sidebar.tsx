"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  Activity,
  X,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
}

export interface SidebarUser {
  initials: string;
  name: string;
  subtitle: string;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  navItems: NavItem[];
  user: SidebarUser;
  /** The root href used for exact-match active check (e.g. "/dashboard" or "/patient") */
  rootPath: string;
}

const SIDEBAR_GRADIENT = "linear-gradient(180deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)";

function SidebarContent({
  collapsed,
  onToggle,
  onMobileClose,
  isMobile = false,
  navItems,
  user,
  rootPath,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
  isMobile?: boolean;
  navItems: NavItem[];
  user: SidebarUser;
  rootPath: string;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === rootPath) return pathname === rootPath;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5">
        <AnimatePresence mode="wait">
          {(!collapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Activity className="text-white" size={18} />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">
                TrailMatch
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && !isMobile && (
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mx-auto">
            <Activity className="text-white" size={18} />
          </div>
        )}

        {isMobile ? (
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <X size={18} />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-white/10 mb-3" />

      {/* Nav Links */}
      <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto scrollbar-thin">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={isMobile ? onMobileClose : undefined}>
              <motion.div
                whileHover={{ x: collapsed && !isMobile ? 0 : 3 }}
                transition={{ duration: 0.15 }}
                className={clsx(
                  "sidebar-link",
                  active ? "sidebar-link-active" : "sidebar-link-inactive",
                  collapsed && !isMobile && "justify-center px-2"
                )}
                title={collapsed && !isMobile ? item.label : undefined}
              >
                <item.icon size={18} className="flex-shrink-0" />
                <AnimatePresence mode="wait">
                  {(!collapsed || isMobile) && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 mt-auto">
        <div className="mx-0 h-px bg-white/10 mb-4" />
        <AnimatePresence mode="wait">
          {(!collapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{user.initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user.name}</p>
                <p className="text-white/50 text-xs truncate">{user.subtitle}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {collapsed && !isMobile && (
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mx-auto">
            <span className="text-white text-xs font-bold">{user.initials}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
  navItems,
  user,
  rootPath,
}: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className="hidden md:flex flex-col h-screen sticky top-0 overflow-hidden flex-shrink-0 z-20"
        style={{ background: SIDEBAR_GRADIENT }}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggle={onToggle}
          navItems={navItems}
          user={user}
          rootPath={rootPath}
        />
      </motion.aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="fixed top-0 left-0 w-64 h-screen flex flex-col z-40 md:hidden overflow-hidden"
              style={{ background: SIDEBAR_GRADIENT }}
            >
              <SidebarContent
                collapsed={false}
                onToggle={onToggle}
                onMobileClose={onMobileClose}
                isMobile={true}
                navItems={navItems}
                user={user}
                rootPath={rootPath}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
