"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye, EyeOff, Activity, Mail, Lock, User, Building2, ArrowRight, ChevronDown,
  Stethoscope, FlaskConical, Microscope,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authRegister } from "@/lib/api";

// ── Schemas ────────────────────────────────────────────────────────────
const doctorSchema = z.object({
  role: z.literal("doctor"),
  name: z.string().min(2, "Name is required"),
  degree: z.string().min(2, "Medical degree is required"),
  hospital: z.string().min(2, "Hospital / Clinic name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const pharmaSchema = z.object({
  role: z.literal("pharma"),
  companyName: z.string().min(2, "Company name is required"),
  orgEmail: z.string().email("Invalid organization email"),
  department: z.string().min(2, "Department is required"),
  country: z.string().min(2, "Country is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const researcherSchema = z.object({
  role: z.literal("researcher"),
  name: z.string().min(2, "Name is required"),
  institution: z.string().min(2, "Institution is required"),
  researchField: z.string().min(2, "Research field is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type DoctorForm = z.infer<typeof doctorSchema>;
type PharmaForm = z.infer<typeof pharmaSchema>;
type ResearcherForm = z.infer<typeof researcherSchema>;

type Role = "doctor" | "pharma" | "researcher" | "";

const roleOptions = [
  {
    value: "doctor" as Role,
    label: "Doctor",
    icon: Stethoscope,
    description: "Medical practitioner",
    color: "bg-brand-purple-light text-brand-purple",
  },
  {
    value: "pharma" as Role,
    label: "Pharmaceutical Company",
    icon: FlaskConical,
    description: "Pharma / Biotech organization",
    color: "bg-brand-blue-light text-blue-700",
  },
  {
    value: "researcher" as Role,
    label: "Clinical Researcher",
    icon: Microscope,
    description: "Academic / Research institute",
    color: "bg-brand-orange-light text-orange-700",
  },
];

// ── Doctor Form ──────────────────────────────────────────────────────
function DoctorSignupForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<DoctorForm>({
    resolver: zodResolver(doctorSchema),
    defaultValues: { role: "doctor" },
  });

  const onSubmit = async (data: DoctorForm) => {
    setLoading(true);
    setApiError(null);
    try {
      await authRegister("DOCTOR", {
        email: data.email,
        password: data.password,
        full_name: data.name,
        medical_degree: data.degree,
        hospital_name: data.hospital,
      });
      router.push("/login");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  return (
    <>
      {apiError && <div className="mb-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{apiError}</div>}
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <input type="hidden" {...register("role")} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Full Name" placeholder="Dr. Sarah Chen" leftIcon={<User size={15} />} error={errors.name?.message} {...register("name")} />
        <Input label="Medical Degree" placeholder="MBBS, MD" error={errors.degree?.message} {...register("degree")} />
      </div>
      <Input label="Hospital / Clinic Name" placeholder="AIIMS New Delhi" leftIcon={<Building2 size={15} />} error={errors.hospital?.message} {...register("hospital")} />
      <Input label="Email address" type="email" placeholder="doctor@hospital.com" leftIcon={<Mail size={15} />} error={errors.email?.message} {...register("email")} />
      <Input label="Password" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" leftIcon={<Lock size={15} />} rightIcon={showPassword ? <EyeOff size={15} /> : <Eye size={15} />} onRightIconClick={() => setShowPassword(!showPassword)} error={errors.password?.message} {...register("password")} />
      <div className="flex gap-3 mt-1">
        <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onBack}>Back</Button>
        <Button type="submit" variant="primary" size="md" loading={loading} rightIcon={<ArrowRight size={15} />} className="flex-1">Create Account</Button>
      </div>
    </form>
    </>
  );
}

// ── Pharma Form ──────────────────────────────────────────────────────
function PharmaSignupForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<PharmaForm>({
    resolver: zodResolver(pharmaSchema),
    defaultValues: { role: "pharma" },
  });

  const onSubmit = async (data: PharmaForm) => {
    setLoading(true);
    setApiError(null);
    try {
      await authRegister("PHARMACEUTICAL_COMPANY", {
        email: data.orgEmail,
        password: data.password,
        company_name: data.companyName,
        department: data.department,
        country: data.country,
      });
      router.push("/login");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  return (
    <>
      {apiError && <div className="mb-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{apiError}</div>}
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <input type="hidden" {...register("role")} />
      <Input label="Company Name" placeholder="Cipla Ltd / Biocon" leftIcon={<Building2 size={15} />} error={errors.companyName?.message} {...register("companyName")} />
      <Input label="Organization Email" type="email" placeholder="research@company.com" leftIcon={<Mail size={15} />} error={errors.orgEmail?.message} {...register("orgEmail")} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="Department / Division" placeholder="R&D / Clinical Affairs" error={errors.department?.message} {...register("department")} />
        <Input label="Country" placeholder="India" error={errors.country?.message} {...register("country")} />
      </div>
      <Input label="Password" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" leftIcon={<Lock size={15} />} rightIcon={showPassword ? <EyeOff size={15} /> : <Eye size={15} />} onRightIconClick={() => setShowPassword(!showPassword)} error={errors.password?.message} {...register("password")} />
      <div className="flex gap-3 mt-1">
        <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onBack}>Back</Button>
        <Button type="submit" variant="primary" size="md" loading={loading} rightIcon={<ArrowRight size={15} />} className="flex-1">Create Account</Button>
      </div>
    </form>
    </>
  );
}

// ── Researcher Form ──────────────────────────────────────────────────
function ResearcherSignupForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ResearcherForm>({
    resolver: zodResolver(researcherSchema),
    defaultValues: { role: "researcher" },
  });

  const onSubmit = async (data: ResearcherForm) => {
    setLoading(true);
    setApiError(null);
    try {
      await authRegister("CLINICAL_RESEARCHER", {
        email: data.email,
        password: data.password,
        full_name: data.name,
        research_fields: [data.researchField],
      });
      router.push("/login");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  return (
    <>
      {apiError && <div className="mb-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{apiError}</div>}
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <input type="hidden" {...register("role")} />
      <Input label="Full Name" placeholder="Dr. Priya Sharma" leftIcon={<User size={15} />} error={errors.name?.message} {...register("name")} />
      <Input label="Institution / University" placeholder="IIT Bombay / TIFR" leftIcon={<Building2 size={15} />} error={errors.institution?.message} {...register("institution")} />
      <Input label="Research Field" placeholder="Oncology, Cardiology..." error={errors.researchField?.message} {...register("researchField")} />
      <Input label="Email address" type="email" placeholder="researcher@institution.edu" leftIcon={<Mail size={15} />} error={errors.email?.message} {...register("email")} />
      <Input label="Password" type={showPassword ? "text" : "password"} placeholder="Min. 8 characters" leftIcon={<Lock size={15} />} rightIcon={showPassword ? <EyeOff size={15} /> : <Eye size={15} />} onRightIconClick={() => setShowPassword(!showPassword)} error={errors.password?.message} {...register("password")} />
      <div className="flex gap-3 mt-1">
        <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onBack}>Back</Button>
        <Button type="submit" variant="primary" size="md" loading={loading} rightIcon={<ArrowRight size={15} />} className="flex-1">Create Account</Button>
      </div>
    </form>
    </>
  );
}

// ── Main Signup Page ─────────────────────────────────────────────────
export default function SignupPage() {
  const [selectedRole, setSelectedRole] = useState<Role>("");
  const [step, setStep] = useState<"select" | "form">("select");

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (selectedRole) setStep("form");
  };

  const handleBack = () => {
    setStep("select");
  };

  const selectedRoleOption = roleOptions.find((r) => r.value === selectedRole);

  return (
    <div className="min-h-screen bg-auth-gradient flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-purple/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-brand-orange/10 blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <div className="w-11 h-11 rounded-2xl bg-brand-purple flex items-center justify-center shadow-lg">
            <Activity className="text-white" size={22} />
          </div>
          <span className="text-2xl font-bold text-text-primary tracking-tight">
            TrailMatch
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card rounded-3xl p-8"
        >
          <AnimatePresence mode="wait">
            {step === "select" ? (
              <motion.div
                key="select"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-text-primary">
                    Create your account
                  </h1>
                  <p className="text-sm text-text-muted mt-1.5">
                    Select your role to get started
                  </p>
                </div>

                <div className="flex flex-col gap-3 mb-6">
                  {roleOptions.map((role) => (
                    <motion.button
                      key={role.value}
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleRoleSelect(role.value)}
                      className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                        selectedRole === role.value
                          ? "border-brand-purple bg-brand-purple-light/50 shadow-sm"
                          : "border-surface-border hover:border-brand-purple/50 hover:bg-surface-muted bg-white"
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${role.color}`}>
                        <role.icon size={20} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-text-primary">{role.label}</p>
                        <p className="text-xs text-text-muted mt-0.5">{role.description}</p>
                      </div>
                      {selectedRole === role.value && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full bg-brand-purple flex items-center justify-center flex-shrink-0"
                        >
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!selectedRole}
                  rightIcon={<ArrowRight size={16} />}
                  onClick={handleContinue}
                >
                  Continue as{" "}
                  {selectedRoleOption ? selectedRoleOption.label : "..."}
                </Button>

                <div className="mt-5 text-center">
                  <p className="text-sm text-text-muted">
                    Already have an account?{" "}
                    <Link href="/login" className="text-brand-purple font-semibold hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                {/* Role header */}
                {selectedRoleOption && (
                  <div className="flex items-center gap-3 mb-6 pb-5 border-b border-surface-border">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedRoleOption.color}`}>
                      <selectedRoleOption.icon size={18} />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-text-primary">
                        {selectedRoleOption.label} Signup
                      </h1>
                      <p className="text-xs text-text-muted">
                        Fill in your professional details
                      </p>
                    </div>
                  </div>
                )}

                {selectedRole === "doctor" && <DoctorSignupForm onBack={handleBack} />}
                {selectedRole === "pharma" && <PharmaSignupForm onBack={handleBack} />}
                {selectedRole === "researcher" && <ResearcherSignupForm onBack={handleBack} />}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-text-muted mt-5"
        >
          By creating an account you agree to our Terms of Service and Privacy Policy.
        </motion.p>
      </div>
    </div>
  );
}
