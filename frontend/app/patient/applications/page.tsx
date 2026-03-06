"use client";

import { motion } from "framer-motion";
import { Send } from "lucide-react";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function ApplicationsPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <Send size={22} className="text-blue-600" /> My Applications
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Track the status of your clinical trial applications
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-card p-12 flex flex-col items-center gap-3 text-center">
        <Send size={32} className="text-text-muted" />
        <p className="font-semibold text-text-primary">Application tracking coming soon</p>
        <p className="text-sm text-text-muted max-w-sm">
          We&apos;re building the ability to track your trial applications. In the meantime, browse your matches and reach out to trial coordinators directly.
        </p>
        <Link href="/patient/matches" className="text-sm text-brand-purple hover:underline font-medium mt-1">
          View trial matches →
        </Link>
      </motion.div>
    </motion.div>
  );
}
