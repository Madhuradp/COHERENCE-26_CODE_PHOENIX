"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Activity, Mail, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authLogin } from "@/lib/api";
import { useAuth } from "@/lib/authContext";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await authLogin(data.email, data.password);
      auth.login(res.access_token, res.user);
      const role = res.user.role;
      if (role === "PATIENT") router.push("/patient");
      else if (role === "AUDITOR") router.push("/admin");
      else router.push("/dashboard");
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-auth-gradient flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-brand-purple/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-brand-blue/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-orange/5 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
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

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-card rounded-3xl p-8"
        >
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
            <p className="text-sm text-text-muted mt-1.5">
              Sign in to your TrailMatch account
            </p>
          </div>

          {apiError && (
            <div className="mb-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {apiError}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Email address"
              type="email"
              placeholder="doctor@hospital.com"
              leftIcon={<Mail size={16} />}
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              leftIcon={<Lock size={16} />}
              rightIcon={showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              onRightIconClick={() => setShowPassword(!showPassword)}
              error={errors.password?.message}
              {...register("password")}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-surface-border accent-brand-purple cursor-pointer"
                />
                <span className="text-xs text-text-muted group-hover:text-text-primary transition-colors">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="text-xs text-brand-purple hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              rightIcon={<ArrowRight size={16} />}
              className="w-full mt-2"
            >
              Sign in
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-muted">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-brand-purple font-semibold hover:underline"
              >
                Create account
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-text-muted mt-6"
        >
          For clinicians, pharma teams and researchers.
          <br />
          Patient-trial matching powered by AI.
        </motion.p>
      </div>
    </div>
  );
}
