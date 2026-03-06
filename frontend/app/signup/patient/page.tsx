"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, Activity, Mail, Lock, User, ArrowRight, Heart, CheckCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authRegister } from "@/lib/api";

const patientSignupSchema = z.object({
  name: z.string().min(2, "Full name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type PatientSignupForm = z.infer<typeof patientSignupSchema>;

const perks = [
  "Discover trials matched to your health profile",
  "Completely free for patients",
  "Your data is encrypted and private",
  "Apply directly from the platform",
];

export default function PatientSignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PatientSignupForm>({
    resolver: zodResolver(patientSignupSchema),
  });

  const onSubmit = async (data: PatientSignupForm) => {
    setLoading(true);
    setApiError(null);
    try {
      await authRegister("PATIENT", {
        email: data.email,
        password: data.password,
        patient_name: data.name,
      });
      router.push("/login");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-auth-gradient flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-blue/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-purple/10 blur-3xl" />
      </div>

      <div className="w-full max-w-4xl relative">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-2.5 mb-8"
        >
          <div className="w-10 h-10 rounded-2xl bg-brand-purple flex items-center justify-center shadow-lg">
            <Activity className="text-white" size={20} />
          </div>
          <span className="text-2xl font-bold text-text-primary tracking-tight">
            TrailMatch
          </span>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Perks panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="hidden md:flex flex-col justify-center rounded-3xl p-8 text-white relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #2563EB 100%)",
            }}
          >
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-white/5 blur-2xl" />

            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mb-6">
                <Heart className="text-white" size={26} />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Your health journey starts here
              </h2>
              <p className="text-white/70 text-sm leading-relaxed mb-8">
                Create a free patient account and get matched with clinical trials
                suited to your health profile in minutes.
              </p>
              <div className="flex flex-col gap-3">
                {perks.map((perk) => (
                  <div key={perk} className="flex items-start gap-3">
                    <CheckCircle size={15} className="text-white/80 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-white/80">{perk}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="glass-card rounded-3xl p-8"
          >
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-purple-light text-brand-purple text-xs font-semibold mb-3">
                <Heart size={12} />
                Patient Account
              </div>
              <h1 className="text-2xl font-bold text-text-primary">
                Create your account
              </h1>
              <p className="text-sm text-text-muted mt-1">
                Free for patients · No credit card required
              </p>
            </div>

            {apiError && <div className="mb-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">{apiError}</div>}
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Full Name"
                type="text"
                placeholder="Rahul Sharma"
                leftIcon={<User size={15} />}
                error={errors.name?.message}
                {...register("name")}
              />
              <Input
                label="Email address"
                type="email"
                placeholder="your@email.com"
                leftIcon={<Mail size={15} />}
                error={errors.email?.message}
                {...register("email")}
              />
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                leftIcon={<Lock size={15} />}
                rightIcon={showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                onRightIconClick={() => setShowPassword(!showPassword)}
                error={errors.password?.message}
                {...register("password")}
              />
              <p className="text-xs text-text-muted leading-relaxed">
                By creating an account you agree to our{" "}
                <a href="#" className="text-brand-purple hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-brand-purple hover:underline">
                  Privacy Policy
                </a>
                .
              </p>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                rightIcon={<ArrowRight size={16} />}
                className="w-full mt-1"
              >
                Create Patient Account
              </Button>
            </form>

            <div className="mt-5 space-y-3 pt-4 border-t border-surface-border">
              <p className="text-sm text-center text-text-muted">
                Already have an account?{" "}
                <Link href="/login" className="text-brand-purple font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
              <p className="text-xs text-center text-text-muted">
                Are you a clinician?{" "}
                <Link href="/signup" className="text-brand-purple hover:underline">
                  Clinician signup
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
