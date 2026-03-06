"use client";

import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const DISEASE_COLORS = [
  "#8B5CF6",
  "#60A5FA",
  "#FB923C",
  "#2DD4BF",
  "#F87171",
  "#A78BFA",
];

interface DiseaseEntry {
  name: string;
  value: number;
  color?: string;
}

interface DiseasePieChartProps {
  data: DiseaseEntry[];
  title?: string;
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: DiseaseEntry }>;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-surface-border rounded-xl shadow-card px-3 py-2">
        <p className="text-xs font-semibold text-text-primary">
          {payload[0].name}
        </p>
        <p className="text-sm font-bold text-brand-purple">
          {payload[0].value.toLocaleString()} patients
        </p>
      </div>
    );
  }
  return null;
};

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  if (percent < 0.06) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function DiseasePieChart({ data, title = "Patients by Disease" }: DiseasePieChartProps) {
  const chartData = data.map((d, i) => ({
    ...d,
    color: d.color || DISEASE_COLORS[i % DISEASE_COLORS.length],
  }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl shadow-card p-6 h-full"
    >
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-muted mb-4">
        Distribution across conditions
      </p>

      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={40}
            dataKey="value"
            labelLine={false}
            label={renderCustomLabel}
            animationBegin={0}
            animationDuration={700}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-text-secondary">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
