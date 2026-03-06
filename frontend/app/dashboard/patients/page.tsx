"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Filter, Search, Download, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, Badge } from "@/components/ui/Table";
import { DatasetUploader } from "@/components/upload/DatasetUploader";
import { listPatients, uploadPatient, type Patient } from "@/lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    listPatients()
      .then((res) => setPatients(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter((p) => {
    const s = search.toLowerCase();
    const id = (p.display_id || p._id).toLowerCase();
    const condition = (p.conditions?.[0]?.name || "").toLowerCase();
    return id.includes(s) || condition.includes(s);
  });

  const handleUpload = async (_file: File, preview: string[][]) => {
    if (preview.length < 2) return;
    const headers = preview[0];
    const rows = preview.slice(1);
    setUploadStatus("Uploading...");
    let count = 0;
    for (const row of rows) {
      if (row.length < 2) continue;
      const data: Record<string, unknown> = {};
      headers.forEach((h, i) => { data[h] = row[i] || ""; });
      try {
        await uploadPatient(data);
        count++;
      } catch {}
    }
    setUploadStatus(`Uploaded ${count} patient records successfully`);
    // Refresh patient list
    listPatients().then((res) => setPatients(res.data));
  };

  const columns = [
    {
      key: "_id",
      header: "Patient ID",
      render: (_v: unknown, row: Record<string, unknown>) => (
        <span className="font-mono text-xs font-semibold text-brand-purple">
          {String((row.display_id as string) || (row._id as string)).slice(0, 12)}
        </span>
      ),
    },
    {
      key: "demographics",
      header: "Age",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const d = row.demographics as Record<string, unknown> | undefined;
        return <span>{d?.age ? String(d.age) : "—"}</span>;
      },
    },
    {
      key: "gender",
      header: "Gender",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const d = row.demographics as Record<string, unknown> | undefined;
        const g = String(d?.gender || "");
        return g ? <Badge variant={g.toLowerCase() === "male" ? "blue" : "orange"}>{g}</Badge> : <span>—</span>;
      },
    },
    {
      key: "conditions",
      header: "Condition",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const conditions = row.conditions as Array<{ name: string }> | undefined;
        const name = conditions?.[0]?.name || "—";
        return <Badge variant="purple">{name}</Badge>;
      },
    },
    {
      key: "medications",
      header: "Medications",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const meds = row.medications as Array<{ name: string }> | undefined;
        return <span className="text-xs">{meds?.map((m) => m.name).join(", ") || "—"}</span>;
      },
    },
    {
      key: "lab_values",
      header: "Lab Values",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const labs = row.lab_values as Array<{ name: string; value: unknown; unit: string }> | undefined;
        if (!labs?.length) return <span>—</span>;
        return <span className="text-xs">{labs[0].name}: {String(labs[0].value)} {labs[0].unit}</span>;
      },
    },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Users size={22} className="text-brand-purple" /> Patients
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            {patients.length.toLocaleString()} records · Upload or manage datasets
          </p>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<Download size={15} />}>
          Export CSV
        </Button>
      </motion.div>

      {/* Upload card */}
      <motion.div variants={itemVariants}>
        <Card>
          <DatasetUploader onUpload={handleUpload} />
          {uploadStatus && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 size={15} /> {uploadStatus}
            </div>
          )}
        </Card>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </motion.div>
      )}

      {/* Table */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search by ID, condition..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-white border border-surface-border focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/10 outline-none transition-all"
            />
          </div>
          <Button variant="secondary" size="sm" leftIcon={<Filter size={14} />}>
            Filters
          </Button>
          <span className="text-xs text-text-muted ml-auto">
            Showing {filtered.length} of {patients.length} patients
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-surface-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <Table
            columns={columns as Parameters<typeof Table>[0]["columns"]}
            data={filtered as Record<string, unknown>[]}
            emptyMessage="No patients found. Upload a CSV dataset to get started."
          />
        )}
      </motion.div>
    </motion.div>
  );
}
