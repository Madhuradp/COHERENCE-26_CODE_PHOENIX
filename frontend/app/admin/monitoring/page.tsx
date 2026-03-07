"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, CheckCircle, AlertTriangle, XCircle, Cpu, HardDrive, MemoryStick, Zap } from "lucide-react";
import { Card, StatCard } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function StatusDot({ status }: { status: "healthy" | "degraded" | "down" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
      status === "healthy" ? "text-emerald-600" :
      status === "degraded" ? "text-orange-500" : "text-red-500"
    }`}>
      <span className={`w-2 h-2 rounded-full ${
        status === "healthy" ? "bg-emerald-400" :
        status === "degraded" ? "bg-orange-400" : "bg-red-400"
      }`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function GaugeBar({ value, color = "brand-purple" }: { value: number; color?: string }) {
  const bgMap: Record<string, string> = {
    "brand-purple": "bg-brand-purple",
    "blue": "bg-blue-500",
    "orange": "bg-orange-500",
    "emerald": "bg-emerald-500",
  };
  const bg = bgMap[color] ?? "bg-brand-purple";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full bg-surface-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${bg}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-text-primary w-10 text-right">{value}%</span>
    </div>
  );
}

interface MonitoringData {
  uptime: string;
  p95Latency: string;
  errorRate: string;
  activeUsers: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  apiCalls: number;
  recentAuditLogs: number;
  databaseMetrics: {
    total_patients: number;
    total_trials: number;
    total_matches: number;
    total_audit_logs: number;
  };
  uptimeTrend: Array<{ hour: string; uptime: number }>;
  services: Array<{ name: string; status: "healthy" | "degraded" | "down"; latency: string; uptime: string }>;
}

export default function SystemMonitoringPage() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonitoringData = async () => {
      try {
        const response = await fetch("/api/analytics/monitoring");
        if (!response.ok) throw new Error("Failed to fetch monitoring data");
        const result = await response.json();
        setData(result.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error loading monitoring data");
      } finally {
        setLoading(false);
      }
    };

    fetchMonitoringData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <>
        <ProgressBar isLoading={true} label="Loading monitoring metrics..." />
        <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface-muted animate-pulse" />
          ))}
        </motion.div>
      </>
    );
  }

  if (error || !data) {
    return (
      <motion.div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
        {error || "Failed to load monitoring data"}
      </motion.div>
    );
  }

  const healthyCount = data.services.filter((s) => s.status === "healthy").length;
  const degradedCount = data.services.filter((s) => s.status === "degraded").length;
  const downCount = data.services.filter((s) => s.status === "down").length;

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
          <Activity size={22} className="text-brand-purple" /> System Monitoring
        </h1>
        <p className="text-sm text-text-muted mt-0.5">Real-time infrastructure health and performance metrics</p>
      </motion.div>

      {/* Summary cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Uptime"
          value={data.uptime}
          icon={<CheckCircle size={18} className="text-emerald-500" />}
          iconBg="bg-emerald-100"
          subtitle="Last 30 days"
        />
        <StatCard
          title="P95 Latency"
          value={data.p95Latency}
          icon={<Zap size={18} className="text-blue-500" />}
          iconBg="bg-blue-100"
          subtitle="API response time"
        />
        <StatCard
          title="Error Rate"
          value={data.errorRate}
          icon={<AlertTriangle size={18} className="text-orange-500" />}
          iconBg="bg-orange-100"
          subtitle="5xx responses"
        />
        <StatCard
          title="Active Users"
          value={String(data.activeUsers)}
          icon={<Activity size={18} className="text-brand-purple" />}
          iconBg="bg-brand-purple-light"
          subtitle="Right now"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Uptime Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-text-primary">Uptime — Last 24 Hours</h2>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" />{healthyCount} healthy</span>
                {degradedCount > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400" />{degradedCount} degraded</span>}
                {downCount > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />{downCount} down</span>}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.uptimeTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="uptGrad" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="uptime" stroke="#7C3AED" strokeWidth={2} fill="url(#uptGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Resource Usage */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <h2 className="font-semibold text-text-primary mb-4">Resource Usage</h2>
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Cpu size={14} className="text-brand-purple" />
                  <span className="text-sm text-text-secondary">CPU</span>
                </div>
                <GaugeBar value={data.cpuUsage} color="brand-purple" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <MemoryStick size={14} className="text-blue-500" />
                  <span className="text-sm text-text-secondary">Memory</span>
                </div>
                <GaugeBar value={data.memoryUsage} color="blue" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <HardDrive size={14} className="text-orange-500" />
                  <span className="text-sm text-text-secondary">Disk</span>
                </div>
                <GaugeBar value={data.diskUsage} color="orange" />
              </div>
              <div className="pt-3 border-t border-surface-border">
                <p className="text-xs text-text-muted">API calls in last hour</p>
                <p className="text-xl font-bold text-text-primary mt-0.5">{data.apiCalls.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Database Metrics */}
      <motion.div variants={itemVariants}>
        <Card>
          <h2 className="font-semibold text-text-primary mb-4">Database Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-xl bg-surface-muted">
              <p className="text-xs text-text-muted mb-1">Total Patients</p>
              <p className="text-xl font-bold text-text-primary">{data.databaseMetrics.total_patients}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-muted">
              <p className="text-xs text-text-muted mb-1">Clinical Trials</p>
              <p className="text-xl font-bold text-text-primary">{data.databaseMetrics.total_trials}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-muted">
              <p className="text-xs text-text-muted mb-1">Total Matches</p>
              <p className="text-xl font-bold text-text-primary">{data.databaseMetrics.total_matches}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface-muted">
              <p className="text-xs text-text-muted mb-1">Audit Logs</p>
              <p className="text-xl font-bold text-text-primary">{data.databaseMetrics.total_audit_logs}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Services table */}
      <motion.div variants={itemVariants}>
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-border">
            <h2 className="font-semibold text-text-primary">Service Health</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/40">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Service</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Latency</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-text-muted">Uptime</th>
                </tr>
              </thead>
              <tbody>
                {data.services.map((svc) => (
                  <tr key={svc.name} className="border-b border-surface-border last:border-0 hover:bg-surface-muted/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-text-primary text-sm">{svc.name}</td>
                    <td className="px-5 py-3.5">
                      <StatusDot status={svc.status} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-text-secondary">{svc.latency}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-text-primary">{svc.uptime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
