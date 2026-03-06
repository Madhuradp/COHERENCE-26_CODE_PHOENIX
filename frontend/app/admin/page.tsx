"use client";

import { motion } from "framer-motion";
import {
  ShieldCheck, TrendingUp, TrendingDown, AlertTriangle,
  Users, FlaskConical, Clock, Activity,
} from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Table";
import { adminStats, adminActivityFeed, systemMetrics, adminTrials } from "@/lib/adminMockData";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const activityTypeConfig = {
  trial: { color: "blue", icon: FlaskConical },
  user: { color: "purple", icon: Users },
  security: { color: "red", icon: ShieldCheck },
  system: { color: "orange", icon: Activity },
};

const statIcons = [ShieldCheck, FlaskConical, Clock, TrendingUp];
const statIconBgs = ["bg-brand-purple-light", "bg-blue-100", "bg-orange-100", "bg-emerald-100"];
const statIconColors = ["text-brand-purple", "text-blue-500", "text-orange-500", "text-emerald-500"];

export default function AdminDashboardPage() {
  const activeTrials = adminTrials.filter((t) => t.status === "active").length;
  const totalEnrolled = adminTrials.reduce((s, t) => s + t.enrolled, 0);
  const totalTarget = adminTrials.reduce((s, t) => s + t.target, 0);
  const enrollmentPct = Math.round((totalEnrolled / totalTarget) * 100);

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
          <ShieldCheck size={22} className="text-brand-purple" /> Admin Dashboard
        </h1>
        <p className="text-sm text-text-muted mt-0.5">Platform overview — Hospital Administrators · Ethics Officers · Pharma Auditors</p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {adminStats.map((stat, i) => {
          const Icon = statIcons[i];
          return (
            <StatCard
              key={stat.label}
              title={stat.label}
              value={stat.value}
              icon={<Icon size={18} className={statIconColors[i]} />}
              iconBg={statIconBgs[i]}
              trend={stat.trend}
              subtitle={`${stat.change} · ${stat.subtitle}`}
            />
          );
        })}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Uptime Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-text-primary">System Uptime — Last 24h</h2>
                <p className="text-xs text-text-muted mt-0.5">Overall: {systemMetrics.uptime} uptime</p>
              </div>
              <span className="badge bg-emerald-100 text-emerald-700 text-xs">All systems nominal</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={systemMetrics.uptimeTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="uptimeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} stroke="#CBD5E1" />
                <YAxis domain={[99.5, 100.1]} tick={{ fontSize: 10 }} stroke="#CBD5E1" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }}
                  formatter={(v: number) => [`${v}%`, "Uptime"]}
                />
                <Area type="monotone" dataKey="uptime" stroke="#7C3AED" strokeWidth={2} fill="url(#uptimeGrad)" />
              </AreaChart>
            </ResponsiveContainer>

            {/* Service health dots */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {systemMetrics.services.slice(0, 4).map((svc) => (
                <div key={svc.name} className="flex items-center gap-2 text-xs">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${svc.status === "healthy" ? "bg-emerald-400" : svc.status === "degraded" ? "bg-orange-400" : "bg-red-400"}`} />
                  <span className="text-text-secondary truncate">{svc.name}</span>
                  <span className="text-text-muted ml-auto">{svc.latency}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Activity Feed */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <h2 className="font-semibold text-text-primary mb-4">Recent Activity</h2>
            <div className="flex flex-col gap-3">
              {adminActivityFeed.map((item) => {
                const cfg = activityTypeConfig[item.type];
                const Icon = cfg.icon;
                return (
                  <div key={item.id} className="flex gap-3 items-start">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.type === "security" ? "bg-red-100" :
                      item.type === "system" ? "bg-orange-100" :
                      item.type === "user" ? "bg-brand-purple-light" : "bg-blue-100"
                    }`}>
                      <Icon size={13} className={
                        item.type === "security" ? "text-red-500" :
                        item.type === "system" ? "text-orange-500" :
                        item.type === "user" ? "text-brand-purple" : "text-blue-500"
                      } />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-text-primary leading-snug">{item.action}</p>
                      <p className="text-xs text-text-muted mt-0.5">{item.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Trial enrollment overview */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary">Active Trial Enrollment Overview</h2>
            <span className="text-xs text-text-muted">{totalEnrolled} / {totalTarget} total ({enrollmentPct}%)</span>
          </div>
          <div className="flex flex-col gap-3">
            {adminTrials.filter((t) => t.status === "active").map((trial) => {
              const pct = Math.round((trial.enrolled / trial.target) * 100);
              return (
                <div key={trial.id} className="flex items-center gap-4">
                  <div className="min-w-0 w-48 flex-shrink-0">
                    <p className="text-xs font-medium text-text-primary truncate">{trial.title}</p>
                    <p className="text-xs text-text-muted">{trial.id} · {trial.phase}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-purple to-blue-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-muted w-12 text-right flex-shrink-0">{pct}%</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{trial.enrolled} / {trial.target} enrolled</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
