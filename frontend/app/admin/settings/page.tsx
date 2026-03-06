"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
import {
  Settings, User, Shield, Bell, Database, Save, Eye, EyeOff, CheckCircle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { clsx } from "clsx";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "system", label: "System Config", icon: Database },
];

interface ProfileForm { name: string; email: string; }
interface PasswordForm { currentPassword: string; newPassword: string; confirmPassword: string; }

type Toggle = {
  id: string;
  label: string;
  description: string;
  value: boolean;
};

export default function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [saved, setSaved] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [notifToggles, setNotifToggles] = useState<Toggle[]>([
    { id: "security_alerts", label: "Security Alerts", description: "Failed logins, suspicious activity", value: true },
    { id: "system_health", label: "System Health Alerts", description: "Service degradation or downtime", value: true },
    { id: "ethics_reviews", label: "Ethics Review Updates", description: "New submissions and approvals", value: true },
    { id: "user_signups", label: "New User Registrations", description: "Pending approval requests", value: false },
    { id: "bulk_exports", label: "Bulk Export Warnings", description: "Large data exports flagged", value: true },
  ]);

  const [systemToggles, setSystemToggles] = useState<Toggle[]>([
    { id: "maintenance_mode", label: "Maintenance Mode", description: "Temporarily disable patient-facing features", value: false },
    { id: "audit_strict", label: "Strict Audit Logging", description: "Log all read operations, not just writes", value: true },
    { id: "2fa_required", label: "Require 2FA for All Users", description: "Enforce two-factor authentication platform-wide", value: false },
    { id: "data_anonymization", label: "Patient Data Anonymization", description: "Always display patients as PAT_XXXX IDs", value: true },
    { id: "auto_suspend", label: "Auto-Suspend Inactive Users", description: "Suspend accounts inactive for 90+ days", value: false },
  ]);

  const { register: regProfile, handleSubmit: handleProfile } = useForm<ProfileForm>({
    defaultValues: { name: "System Admin", email: "admin@trailmatch.io" },
  });
  const { register: regPass, handleSubmit: handlePass } = useForm<PasswordForm>();

  const onSave = async () => {
    await new Promise((r) => setTimeout(r, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const toggleNotif = (id: string) =>
    setNotifToggles((prev) => prev.map((t) => t.id === id ? { ...t, value: !t.value } : t));

  const toggleSystem = (id: string) =>
    setSystemToggles((prev) => prev.map((t) => t.id === id ? { ...t, value: !t.value } : t));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Settings size={22} className="text-brand-purple" /> Admin Settings
          </h1>
          <p className="text-sm text-text-muted mt-0.5">Platform configuration and account management</p>
        </div>
        {saved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl"
          >
            <CheckCircle size={13} /> Saved!
          </motion.div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-6 flex-col md:flex-row">
        {/* Side tabs */}
        <div className="md:w-48 flex-shrink-0">
          <nav className="flex flex-row md:flex-col gap-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={clsx(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  activeSection === s.id
                    ? "bg-brand-purple text-white shadow-sm"
                    : "text-text-secondary hover:bg-surface-muted"
                )}
              >
                <s.icon size={15} className="flex-shrink-0" />
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
              <div className="mb-6">
                <h2 className="font-bold text-text-primary">Admin Profile</h2>
                <p className="text-xs text-text-muted mt-0.5">Update your administrator account information</p>
              </div>
              <div className="flex items-center gap-4 mb-6 pb-5 border-b border-surface-border">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-purple to-blue-500 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  SA
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Profile Photo</p>
                  <p className="text-xs text-text-muted mt-0.5">JPG, PNG up to 2MB</p>
                  <Button variant="secondary" size="sm" className="mt-2">Change Photo</Button>
                </div>
              </div>
              <form onSubmit={handleProfile(onSave)} className="flex flex-col gap-4">
                <Input label="Full Name" {...regProfile("name")} />
                <Input label="Email address" type="email" {...regProfile("email")} />
                <div className="flex justify-end mt-2">
                  <Button type="submit" variant="primary" size="md" leftIcon={<Save size={14} />}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Security */}
          {activeSection === "security" && (
            <Card>
              <div className="mb-6">
                <h2 className="font-bold text-text-primary">Security</h2>
                <p className="text-xs text-text-muted mt-0.5">Change your admin password</p>
              </div>
              <form onSubmit={handlePass(onSave)} className="flex flex-col gap-4 max-w-sm">
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
                <div className="flex justify-start mt-2">
                  <Button type="submit" variant="primary" size="md" leftIcon={<Shield size={14} />}>
                    Update Password
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Notifications */}
          {activeSection === "notifications" && (
            <Card>
              <div className="mb-6">
                <h2 className="font-bold text-text-primary">Notification Preferences</h2>
                <p className="text-xs text-text-muted mt-0.5">Choose which platform events trigger admin notifications</p>
              </div>
              <div className="flex flex-col gap-4">
                {notifToggles.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-4 py-3 border-b border-surface-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{t.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">{t.description}</p>
                    </div>
                    <button
                      onClick={() => toggleNotif(t.id)}
                      className={clsx(
                        "relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0",
                        t.value ? "bg-brand-purple" : "bg-surface-border"
                      )}
                    >
                      <span
                        className={clsx(
                          "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
                          t.value ? "left-6" : "left-1"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="primary" size="md" leftIcon={<Save size={14} />} onClick={onSave}>
                  Save Preferences
                </Button>
              </div>
            </Card>
          )}

          {/* System Config */}
          {activeSection === "system" && (
            <Card>
              <div className="mb-6">
                <h2 className="font-bold text-text-primary">System Configuration</h2>
                <p className="text-xs text-text-muted mt-0.5">Platform-wide feature flags and compliance settings</p>
              </div>
              <div className="flex flex-col gap-4">
                {systemToggles.map((t) => (
                  <div key={t.id} className={clsx(
                    "flex items-center justify-between gap-4 p-3 rounded-xl border transition-colors",
                    t.value ? "bg-brand-purple-light/20 border-brand-purple/20" : "bg-surface-muted/30 border-surface-border"
                  )}>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{t.label}</p>
                      <p className="text-xs text-text-muted mt-0.5">{t.description}</p>
                    </div>
                    <button
                      onClick={() => toggleSystem(t.id)}
                      className={clsx(
                        "relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0",
                        t.value ? "bg-brand-purple" : "bg-surface-border"
                      )}
                    >
                      <span
                        className={clsx(
                          "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
                          t.value ? "left-6" : "left-1"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="primary" size="md" leftIcon={<Save size={14} />} onClick={onSave}>
                  Save Configuration
                </Button>
              </div>
            </Card>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
