"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  LogIn,
  UserPlus,
  Shield,
  Zap,
  ClipboardCheck,
  CheckCircle,
  ChevronRight,
  UploadCloud,
  FlaskConical,
  FileText,
  Users,
  BarChart2,
} from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const steps = [
  {
    number: "01",
    icon: UploadCloud,
    title: "Upload Patient Dataset",
    description:
      "Import anonymized CSV records into the secure pipeline. Patient identities are never exposed — only de-identified health attributes are processed.",
    color: "bg-brand-purple-light",
    iconColor: "text-brand-purple",
  },
  {
    number: "02",
    icon: FlaskConical,
    title: "Run Eligibility Matching",
    description:
      "The AI engine applies rule-based logic and machine learning to evaluate each record against active trial inclusion and exclusion criteria.",
    color: "bg-brand-blue-light",
    iconColor: "text-blue-600",
  },
  {
    number: "03",
    icon: FileText,
    title: "Review Ranked Results",
    description:
      "Browse ranked trial matches with per-patient eligibility explanations. Every recommendation includes transparent reasoning so researchers understand exactly why a patient qualifies or is excluded.",
    color: "bg-brand-orange-light",
    iconColor: "text-orange-600",
  },
];

const features = [
  {
    icon: Shield,
    title: "Privacy by Design",
    description:
      "Patient records are anonymized before processing. The system enforces strict data governance and HIPAA compliance — no personally identifiable information enters the matching pipeline.",
    color: "bg-brand-purple-light",
    iconColor: "text-brand-purple",
  },
  {
    icon: Zap,
    title: "Explainable AI Matching",
    description:
      "Our hybrid eligibility engine combines rule-based filters with machine learning to rank trial matches — and explains every decision. Researchers can audit each match against trial criteria in full detail.",
    color: "bg-brand-teal-light",
    iconColor: "text-teal-600",
  },
  {
    icon: ClipboardCheck,
    title: "Compliance & Audit Tools",
    description:
      "Auditors get dedicated access to fairness metrics, anonymization verification logs, and full audit trails — enabling ethical oversight of every matching run.",
    color: "bg-brand-orange-light",
    iconColor: "text-orange-600",
  },
];

const stats = [
  { value: "10,000+", label: "Records processed", icon: Users },
  { value: "340+", label: "Trials indexed", icon: FlaskConical },
  { value: "91%", label: "Match accuracy", icon: BarChart2 },
  { value: "100%", label: "Audit coverage", icon: CheckCircle },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-bg font-sans">
      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-surface-border"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-purple flex items-center justify-center">
              <Activity className="text-white" size={18} />
            </div>
            <span className="text-lg font-bold text-text-primary tracking-tight">
              TrailMatch
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-text-secondary">
            <a href="#how-it-works" className="hover:text-text-primary transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-text-primary transition-colors">
              Features
            </a>
            <a href="#about" className="hover:text-text-primary transition-colors">
              About
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-all duration-200"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-brand-purple text-white hover:bg-violet-600 shadow-sm transition-all duration-200"
            >
              Sign up
            </Link>
          </div>
        </div>
      </motion.header>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(135deg, #EDE9FE 0%, #DBEAFE 45%, #FFEDD5 100%)",
          }}
        />
        {/* Blobs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-brand-purple/10 blur-3xl -z-10" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-brand-blue/10 blur-3xl -z-10" />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-purple-light text-brand-purple text-xs font-semibold border border-brand-purple/20">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-pulse" />
              AI-Powered Clinical Trial Eligibility Engine
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary leading-tight tracking-tight max-w-4xl mx-auto"
          >
            AI Infrastructure for{" "}
            <span className="text-gradient-purple">Clinical Trial Eligibility & Matching</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-5 text-base sm:text-lg text-text-secondary max-w-2xl mx-auto leading-relaxed"
          >
            TrailMatch gives research institutions a secure, explainable pipeline to match
            anonymized patient cohorts against real-world trial criteria — with full auditability
            and ethical safeguards built in.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8"
          >
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-brand-purple text-white font-semibold text-sm hover:bg-violet-600 shadow-md hover:shadow-lg transition-all duration-200"
            >
              <LogIn size={15} />
              Login
            </Link>
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white text-text-primary font-semibold text-sm border border-surface-border hover:border-brand-purple hover:text-brand-purple hover:bg-brand-purple-light/40 shadow-card transition-all duration-200"
            >
              <UserPlus size={15} />
              Sign up
            </Link>
          </motion.div>

          {/* Role callout */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6"
          >
            <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-white/70 backdrop-blur-sm border border-white shadow-card text-left">
              <div className="w-8 h-8 rounded-xl bg-brand-purple-light flex items-center justify-center shrink-0 mt-0.5">
                <UploadCloud size={15} className="text-brand-purple" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary">Researcher</p>
                <p className="text-xs text-text-muted leading-relaxed">Upload datasets · Run AI matching · View ranked results</p>
              </div>
            </div>
            <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-white/70 backdrop-blur-sm border border-white shadow-card text-left">
              <div className="w-8 h-8 rounded-xl bg-brand-orange-light flex items-center justify-center shrink-0 mt-0.5">
                <ClipboardCheck size={15} className="text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary">Auditor</p>
                <p className="text-xs text-text-muted leading-relaxed">Monitor compliance · Fairness metrics · Audit logs</p>
              </div>
            </div>
          </motion.div>

          {/* Trust badge */}
          <motion.p
            variants={itemVariants}
            className="mt-5 text-xs text-text-muted"
          >
            HIPAA Compliant · IRB-Ready · No PHI Exposure · Explainable AI
          </motion.p>

          {/* Floating stat pills */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center justify-center gap-3 mt-10"
          >
            {stats.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/70 backdrop-blur-sm border border-white shadow-card"
              >
                <s.icon size={15} className="text-brand-purple" />
                <span className="font-bold text-text-primary text-sm">{s.value}</span>
                <span className="text-xs text-text-muted">{s.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <span className="text-xs font-semibold text-brand-purple uppercase tracking-wider">
              Researcher Workflow
            </span>
            <h2 className="text-3xl font-bold text-text-primary mt-2">
              How TrailMatch Works
            </h2>
            <p className="text-text-secondary mt-3 max-w-xl mx-auto text-sm">
              A three-step pipeline from anonymized data ingestion to ranked,
              explainable trial recommendations — built for research teams.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="relative bg-white rounded-2xl border border-surface-border shadow-card p-6 flex flex-col gap-4"
              >
                {/* Number */}
                <span className="absolute top-4 right-4 text-4xl font-black text-surface-muted/60 leading-none select-none">
                  {step.number}
                </span>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${step.color}`}>
                  <step.icon className={step.iconColor} size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">{step.title}</h3>
                  <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                    <div className="w-6 h-6 rounded-full bg-brand-purple-light border border-brand-purple/20 flex items-center justify-center">
                      <ChevronRight size={12} className="text-brand-purple" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why TrailMatch ────────────────────────────────────────── */}
      <section id="features" className="py-20 bg-surface-bg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <span className="text-xs font-semibold text-brand-purple uppercase tracking-wider">
              Platform Capabilities
            </span>
            <h2 className="text-3xl font-bold text-text-primary mt-2">
              Built for Research Institutions, Powered by AI
            </h2>
            <p className="text-text-secondary mt-3 max-w-xl mx-auto text-sm">
              TrailMatch is a clinical research infrastructure platform combining explainable AI,
              ethical safeguards, and end-to-end audit tooling.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -4, boxShadow: "0 8px 32px rgba(139,92,246,0.1)" }}
                className="bg-white rounded-2xl border border-surface-border shadow-card p-6 flex flex-col gap-4"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${f.color}`}>
                  <f.icon className={f.iconColor} size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">{f.title}</h3>
                  <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                    {f.description}
                  </p>
                </div>
                <div className="mt-auto flex items-center gap-1.5 text-xs font-semibold text-brand-purple">
                  Learn more <ChevronRight size={13} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl p-10 text-center text-white relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)",
            }}
          >
            <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-5">
                <Activity className="text-white" size={24} />
              </div>
              <h2 className="text-3xl font-bold mb-3">
                Ready to Run Your First Eligibility Match?
              </h2>
              <p className="text-white/70 text-sm max-w-md mx-auto mb-7">
                Join research institutions using TrailMatch to accelerate patient recruitment
                while maintaining the highest standards of data privacy and explainability.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white text-brand-purple font-semibold text-sm hover:bg-brand-purple-light transition-all duration-200 shadow-lg"
                >
                  <UserPlus size={15} />
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-medium text-sm hover:bg-white/20 transition-all duration-200"
                >
                  <LogIn size={15} />
                  Login
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer id="about" className="bg-white border-t border-surface-border py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-brand-purple flex items-center justify-center">
                <Activity className="text-white" size={15} />
              </div>
              <span className="font-bold text-text-primary">TrailMatch</span>
            </div>

            <nav className="flex flex-wrap justify-center gap-6 text-sm text-text-muted">
              {["About", "Privacy", "Contact", "Terms"].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="hover:text-text-primary transition-colors"
                >
                  {link}
                </a>
              ))}
            </nav>

            <p className="text-xs text-text-muted text-center md:text-right">
              &copy; {new Date().getFullYear()} TrailMatch. All rights reserved.
              <br />
              HIPAA Compliant · Explainable AI · Ethical Research Infrastructure
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
