"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings, User, Shield, Trash2, Eye, EyeOff, AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
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

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "danger", label: "Delete Account", icon: Trash2 },
];

interface ProfileForm { name: string; email: string; }
interface PasswordForm { currentPassword: string; newPassword: string; confirmPassword: string; }

export default function PatientSettingsPage() {
  const auth = useAuth();
  const [activeSection, setActiveSection] = useState("profile");
  const [profileLoading, setProfileLoading] = useState(true);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  const { register: regProfile } = useForm<ProfileForm>({
    defaultValues: {
      name: auth.user?.full_name || "",
      email: auth.user?.email || "",
    },
  });
  const { register: regPass } = useForm<PasswordForm>();

  useEffect(() => {
    authMe()
      .then((user) => {
        if (user) auth.login(localStorage.getItem("token") || "", user);
      })
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Settings size={22} className="text-brand-purple" /> Settings
        </h1>
        <p className="text-sm text-text-muted mt-0.5">Manage your account and security</p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-6 flex-col md:flex-row">
        <div className="md:w-48 flex-shrink-0">
          <nav className="flex flex-row md:flex-col gap-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={clsx(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left",
                  activeSection === s.id
                    ? s.id === "danger"
                      ? "bg-red-500 text-white shadow-sm"
                      : "bg-brand-purple text-white shadow-sm"
                    : s.id === "danger"
                    ? "text-red-500 hover:bg-red-50"
                    : "text-text-secondary hover:bg-surface-muted"
                )}
              >
                <s.icon size={15} className="flex-shrink-0" />
                <span className="hidden md:block">{s.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 min-w-0">
          {activeSection === "profile" && (
            <Card>
              <div className="mb-6">
                <h2 className="font-bold text-text-primary">Profile Settings</h2>
                <p className="text-xs text-text-muted mt-0.5">Your account information from the platform</p>
              </div>

              <div className="flex items-center gap-4 mb-6 pb-5 border-b border-surface-border">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-brand-purple flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {(auth.user?.full_name || "?").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{auth.user?.full_name || "—"}</p>
                  <p className="text-xs text-text-muted">{auth.user?.email || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-200 mb-5">
                <Shield size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Your medical data is only visible to you. Clinicians can only see anonymized, aggregated information.
                </p>
              </div>

              {profileLoading ? (
                <div className="flex flex-col gap-3">
                  {[...Array(2)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-surface-muted animate-pulse" />)}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <Input label="Full Name" readOnly {...regProfile("name")} />
                  <Input label="Email address" type="email" readOnly {...regProfile("email")} />
                  <p className="text-xs text-text-muted mt-1">
                    Profile editing is managed through the backend. Contact your administrator to update details.
                  </p>
                </div>
              )}
            </Card>
          )}

          {activeSection === "security" && (
            <Card>
              <div className="mb-6">
                <h2 className="font-bold text-text-primary">Security</h2>
                <p className="text-xs text-text-muted mt-0.5">Change your password</p>
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
              <p className="text-xs text-text-muted mt-4">
                Password changes are not available via this interface. Contact your administrator.
              </p>
            </Card>
          )}

          {activeSection === "danger" && (
            <Card className="border border-red-200">
              <div className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <div>
                  <h2 className="font-bold text-text-primary">Delete Account</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Permanently delete your account and all associated health data.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 mb-5">
                <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">This action is irreversible</p>
                  <ul className="text-xs text-red-600 mt-1.5 flex flex-col gap-1 list-disc list-inside">
                    <li>Your health records will be permanently deleted</li>
                    <li>All trial applications will be cancelled</li>
                    <li>Match history will be erased</li>
                    <li>You cannot recover your account after deletion</li>
                  </ul>
                </div>
              </div>

              <AnimatePresence>
                {!confirmDelete ? (
                  <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button variant="danger" size="md" leftIcon={<Trash2 size={14} />} onClick={() => setConfirmDelete(true)}>
                      Delete My Account
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="flex flex-col gap-3"
                  >
                    <p className="text-sm text-text-primary font-medium">
                      Type <strong>DELETE</strong> to confirm account deletion:
                    </p>
                    <input
                      type="text"
                      value={deleteText}
                      onChange={(e) => setDeleteText(e.target.value)}
                      placeholder="Type DELETE to confirm"
                      className="input-field max-w-xs border-red-300 focus:border-red-400 focus:ring-red-100"
                    />
                    <div className="flex gap-3">
                      <Button variant="secondary" size="md" onClick={() => { setConfirmDelete(false); setDeleteText(""); }}>
                        Cancel
                      </Button>
                      <Button variant="danger" size="md" disabled={deleteText !== "DELETE"} leftIcon={<Trash2 size={14} />}>
                        Confirm Delete
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
