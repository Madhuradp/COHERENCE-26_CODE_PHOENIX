"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, ChevronDown, Menu, LogOut, User } from "lucide-react";
import Link from "next/link";

export interface NavbarUser {
  name: string;
  role: string;
  initials: string;
  email: string;
  settingsHref?: string;
}

export interface NavbarNotification {
  id: number;
  text: string;
  time: string;
  unread: boolean;
}

interface TopNavbarProps {
  onMobileMenuToggle: () => void;
  user: NavbarUser;
  notifications?: NavbarNotification[];
  searchPlaceholder?: string;
}

const defaultNotifications: NavbarNotification[] = [
  { id: 1, text: "Patient dataset uploaded successfully", time: "2 min ago", unread: true },
  { id: 2, text: "Trial T101 matching completed — 47 matches", time: "15 min ago", unread: true },
  { id: 3, text: "New trial Diabetes Phase III created", time: "1h ago", unread: false },
  { id: 4, text: "Monthly report is ready for download", time: "3h ago", unread: false },
];

export function TopNavbar({
  onMobileMenuToggle,
  user,
  notifications = defaultNotifications,
  searchPlaceholder = "Search patients, trials...",
}: TopNavbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-surface-border flex items-center px-4 md:px-6 gap-4 sticky top-0 z-10">
      {/* Mobile hamburger */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden p-2 rounded-xl hover:bg-surface-muted transition-colors text-text-secondary"
      >
        <Menu size={20} />
      </button>

      {/* Search */}
      <motion.div
        animate={{ width: searchFocused ? 320 : 240 }}
        transition={{ duration: 0.2 }}
        className="hidden sm:block relative"
      >
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
        />
        <input
          type="text"
          placeholder={searchPlaceholder}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-muted text-sm text-text-primary placeholder-text-muted border border-transparent focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 focus:bg-white outline-none transition-all duration-200"
        />
      </motion.div>

      <div className="flex-1" />

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setNotifOpen(!notifOpen); setAvatarOpen(false); }}
          className="relative p-2.5 rounded-xl hover:bg-surface-muted transition-colors text-text-secondary"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-brand-orange text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-glass border border-surface-border z-50 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                  <span className="font-semibold text-sm text-text-primary">Notifications</span>
                  <span className="badge bg-brand-purple-light text-brand-purple">
                    {unreadCount} new
                  </span>
                </div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-surface-border last:border-0 flex gap-3 cursor-pointer hover:bg-surface-muted transition-colors ${
                      n.unread ? "bg-brand-purple-light/20" : ""
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.unread ? "bg-brand-purple" : "bg-transparent"}`} />
                    <div>
                      <p className="text-xs text-text-primary leading-snug">{n.text}</p>
                      <p className="text-xs text-text-muted mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* User Avatar */}
      <div className="relative">
        <button
          onClick={() => { setAvatarOpen(!avatarOpen); setNotifOpen(false); }}
          className="flex items-center gap-2.5 pl-1 pr-3 py-1.5 rounded-xl hover:bg-surface-muted transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-purple to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-text-primary leading-tight">{user.name}</p>
            <p className="text-xs text-text-muted leading-tight">{user.role}</p>
          </div>
          <ChevronDown
            size={14}
            className={`text-text-muted hidden sm:block transition-transform duration-200 ${avatarOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {avatarOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAvatarOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-glass border border-surface-border z-50 overflow-hidden"
              >
                <div className="p-3 border-b border-surface-border">
                  <p className="text-sm font-semibold text-text-primary">{user.name}</p>
                  <p className="text-xs text-text-muted">{user.email}</p>
                </div>
                <div className="p-1.5">
                  {user.settingsHref && (
                    <>
                      <Link
                        href={user.settingsHref}
                        onClick={() => setAvatarOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-text-secondary hover:bg-surface-muted transition-colors"
                      >
                        <User size={15} /> Profile
                      </Link>
                      <hr className="my-1 border-surface-border" />
                    </>
                  )}
                  <Link
                    href="/login"
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} /> Sign out
                  </Link>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
