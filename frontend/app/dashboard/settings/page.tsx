"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import {
  Settings, User, Shield, Bell, Sliders, Eye, EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { clsx } from "clsx";
import { authMe } from "@/lib/api";
import { useAuth } from "@/lib/authContext";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

interface ProfileForm {
  name: string;
  email: string;
  organization: string;
  role: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface Toggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function SettingsPage() {
  const auth = useAuth();
  const [saved, setSaved] = useState<string | null>(null);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [preferences, setPreferences] = useState<Toggle[]>([
    { id: "autoMatch", label: "Auto-run matching after upload", description: "Automatically run patient matching when a new dataset is uploaded", enabled: true },
    { id: "validation", label: "Enable dataset validation", description: "Validate CSV structure and data types before processing", enabled: true },
  ]);

  const [notifications, setNotifications] = useState<Toggle[]>([
    { id: "emailAlerts", label: "Email alerts", description: "Receive important platform alerts via email", enabled: true },
    { id: "matchComplete", label: "Matching completed alerts", description: "Get notified when a matching job finishes", enabled: true },
    { id: "weeklyReport", label: "Weekly summary report", description: "Receive a weekly digest of platform activity", enabled: false },
    { id: "trialUpdates", label: "Trial status updates", description: "Notifications when trial statuses change", enabled: false },
  ]);

  const { register: regProfile } = useForm<ProfileForm>({
    defaultValues: {
      name: auth.user?.full_name || "",
      email: auth.user?.email || "",
      organization: auth.user?.organization || "",
      role: auth.user?.role || "",
    },
  });

  const { register: regPass } = useForm<PasswordForm>();

  useEffect(() => {
    authMe()
      .then((user) => {
        // Update local user cache if token exists
        if (user) auth.login(localStorage.getItem("token") || "", user);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePreference = (id: string, group: "pref" | "notif") => {
    if (group === "pref") {
      setPreferences((prev) =>
        prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
      );
    } else {
      setNotifications((prev) =>
        prev.map((t) => (t.id === id ? { ...t, enabled: !t.enabled } : t))
      );
    }
  };

  const sections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "preferences", label: "Preferences", icon: Sliders },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];
  const [activeSection, setActiveSection] = useState("profile");

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
          <Settings size={22} className="text-brand-purple" /> Settings
        </h1>
        <p className="text-sm text-text-muted mt-0.5">Manage your profile and platform preferences</p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-6 flex-col md:flex-row">
        {/* Sidebar tabs */}
        <div className="md:w-52 flex-shrink-0">
          <nav className="flex flex-row md:flex-col gap-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={clsx(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left",
                  activeSection === s.id
                    ? "bg-brand-purple text-white shadow-sm"
                    : "text-text-secondary hover:bg-surface-muted"
                )}
              >
                <s.icon size={16} className="flex-shrink-0" />
                <span className="hidden md:block">{s.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Profile */}
          {activeSection === "profile" && (
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-bold text-text-primary">Profile Settings</h2>
                  <p className="text-xs text-text-muted mt-0.5">Your account information from the platform</p>
                </div>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-surface-border">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-purple to-blue-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {(auth.user?.full_name || "?").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{auth.user?.full_name || "—"}</p>
                  <p className="text-xs text-text-muted">{auth.user?.email || "—"}</p>
                  <p className="text-xs text-brand-purple font-medium mt-0.5">{auth.user?.role || "—"}</p>
                </div>
              </div>

              {profileLoading ? (
                <div className="flex flex-col gap-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-surface-muted animate-pulse" />)}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Full Name" readOnly {...regProfile("name")} />
                    <Input label="Email address" type="email" readOnly {...regProfile("email")} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Organization" readOnly {...regProfile("organization")} />
                    <Input label="Role" readOnly {...regProfile("role")} />
                  </div>
                  <p className="text-xs text-text-muted mt-1">Profile editing is managed through the backend. Contact your administrator to update details.</p>
                </div>
              )}
            </Card>
          )}

          {/* Security */}
          {activeSection === "security" && (
            <Card>
              <div className="mb-6">
                <h2 className="font-bold text-text-primary">Security</h2>
                <p className="text-xs text-text-muted mt-0.5">Manage your password and security settings</p>
              </div>
              <div className="flex flex-col gap-4 max-w-sm opacity-60 pointer-events-none">
                <Input
                  label="Current Password"
                  type={showCurrentPass ? "text" : "password"}
                  placeholder="Enter current password"
                  rightIcon={showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  onRightIconClick={() => setShowCurrentPass(!showCurrentPass)}
                  {...regPass("currentPassword")}
                />
                <Input
                  label="New Password"
                  type={showNewPass ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  rightIcon={showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  onRightIconClick={() => setShowNewPass(!showNewPass)}
                  {...regPass("newPassword")}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Repeat new password"
                  {...regPass("confirmPassword")}
                />
              </div>
              <p className="text-xs text-text-muted mt-4">Password changes are not available via this interface. Contact your administrator.</p>
            </Card>
          )}

          {/* Preferences */}
          {activeSection === "preferences" && (
            <Card>
              <div className="mb-6">
                <h2 className="font-bold text-text-primary">Preferences</h2>
                <p className="text-xs text-text-muted mt-0.5">Customize platform behavior</p>
              </div>
              <div className="flex flex-col gap-4">
                {preferences.map((pref) => (
                  <div
                    key={pref.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-surface-border hover:bg-surface-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{pref.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">{pref.description}</p>
                    </div>
                    <button
                      onClick={() => togglePreference(pref.id, "pref")}
                      className={clsx(
                        "w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 relative",
                        pref.enabled ? "bg-brand-purple" : "bg-surface-border"
                      )}
                    >
                      <motion.div
                        animate={{ x: pref.enabled ? 20 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <Card>
              <div className="mb-6">
                <h2 className="font-bold text-text-primary">Notifications</h2>
                <p className="text-xs text-text-muted mt-0.5">Control what alerts you receive</p>
              </div>
              <div className="flex flex-col gap-4">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-surface-border hover:bg-surface-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-text-primary">{notif.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">{notif.description}</p>
                    </div>
                    <button
                      onClick={() => togglePreference(notif.id, "notif")}
                      className={clsx(
                        "w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 relative",
                        notif.enabled ? "bg-brand-purple" : "bg-surface-border"
                      )}
                    >
                      <motion.div
                        animate={{ x: notif.enabled ? 20 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                      />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
