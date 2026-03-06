"use client";

import { motion } from "framer-motion";
import { History } from "lucide-react";
import Link from "next/link";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function MatchHistoryPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <History size={22} className="text-brand-purple" /> Match History
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          A log of your previous matching sessions and actions
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-card p-12 flex flex-col items-center gap-3 text-center">
        <History size={32} className="text-text-muted" />
        <p className="font-semibold text-text-primary">Match history coming soon</p>
        <p className="text-sm text-text-muted max-w-sm">
          Historical match logs will be available in a future update. View your current matches to see your latest results.
        </p>
        <Link href="/patient/matches" className="text-sm text-brand-purple hover:underline font-medium mt-1">
          View current matches →
        </Link>
      </motion.div>
    </motion.div>
  );
}
