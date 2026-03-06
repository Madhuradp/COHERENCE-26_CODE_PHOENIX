"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Filter, Search, Download, CheckCircle2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Table, Badge } from "@/components/ui/Table";
import { DatasetUploader } from "@/components/upload/DatasetUploader";
import { listPatients, uploadPatient, deletePatient, bulkDeletePatients, type Patient } from "@/lib/api";
import { transformPatientBatch } from "@/lib/transformPatientData";
import { exportPatientsAsCSV } from "@/lib/csvUtils";

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadCancelled, setUploadCancelled] = useState(false);
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const handleSelectPatient = (patientId: string) => {
    const newSelected = new Set(selectedPatients);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedPatients(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedPatients.size === filtered.length) {
      setSelectedPatients(new Set());
    } else {
      setSelectedPatients(new Set(filtered.map((p) => p._id)));
    }
  };

  const handleDeleteSingle = async (patientId: string) => {
    try {
      await deletePatient(patientId);
      setPatients(patients.filter((p) => p._id !== patientId));
      setSelectedPatients(new Set(Array.from(selectedPatients).filter((id) => id !== patientId)));
      setDeleteConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete patient");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPatients.size === 0) return;

    try {
      await bulkDeletePatients(Array.from(selectedPatients));
      setPatients(patients.filter((p) => !selectedPatients.has(p._id)));
      setSelectedPatients(new Set());
      setDeleteConfirm(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete patients");
    }
  };

  const handleUpload = async (_file: File, preview: string[][]) => {
    if (preview.length < 2) return;
    const headers = preview[0];
    const rows = preview.slice(1).filter((row) => row.length >= 2);

    if (rows.length === 0) {
      setUploadStatus("No valid rows to upload");
      return;
    }

    setIsUploading(true);
    setUploadCancelled(false);
    setUploadProgress(0);
    setUploadStatus(`Uploading 0/${rows.length} records...`);

    // Transform all rows to proper nested structure
    const transformedPatients = transformPatientBatch(headers, rows);

    let successCount = 0;
    let failureCount = 0;

    // Upload each patient with progress tracking
    for (let idx = 0; idx < transformedPatients.length; idx++) {
      // Check if upload was cancelled
      if (uploadCancelled) {
        setIsUploading(false);
        setUploadStatus(`Upload cancelled. ${successCount} records uploaded, ${failureCount} failed.`);
        return;
      }

      try {
        await uploadPatient(transformedPatients[idx]);
        successCount++;
      } catch (err) {
        failureCount++;
        console.error(`Failed to upload patient ${idx + 1}:`, err);
      }

      // Update progress
      const progress = Math.round(((idx + 1) / rows.length) * 100);
      setUploadProgress(progress);
      setUploadStatus(
        `Uploading ${idx + 1}/${rows.length} records... (${progress}%)`
      );
    }

    setIsUploading(false);
    setUploadStatus(
      `Upload complete: ${successCount} succeeded, ${failureCount} failed`
    );

    // Refresh patient list
    setTimeout(() => {
      listPatients().then((res) => setPatients(res.data));
    }, 500);
  };

  const columns = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={selectedPatients.size === filtered.length && filtered.length > 0}
          onChange={handleSelectAll}
          className="w-4 h-4 cursor-pointer"
        />
      ),
      render: (_v: unknown, row: Record<string, unknown>) => (
        <input
          type="checkbox"
          checked={selectedPatients.has(row._id as string)}
          onChange={() => handleSelectPatient(row._id as string)}
          className="w-4 h-4 cursor-pointer"
        />
      ),
    },
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
      header: "Condition(s)",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const conditions = row.conditions as Array<{ name: string }> | undefined;
        if (!conditions?.length) return <span className="text-text-muted">—</span>;

        const conditionNames = conditions.map((c) => c.name);
        const displayText = conditionNames.length > 1
          ? `${conditionNames[0]} +${conditionNames.length - 1}`
          : conditionNames[0];

        return (
          <div className="flex flex-col gap-1">
            <Badge variant="purple">{displayText}</Badge>
            {conditionNames.length > 1 && (
              <span className="text-xs text-text-muted">{conditionNames.join(", ")}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "medications",
      header: "Medications",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const meds = row.medications as Array<{ name: string }> | undefined;
        if (!meds?.length) return <span className="text-text-muted">—</span>;

        const medNames = meds.map((m) => m.name);
        const displayText = medNames.slice(0, 2).join(", ") + (medNames.length > 2 ? ` +${medNames.length - 2}` : "");

        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">{displayText}</span>
            {medNames.length > 2 && (
              <span className="text-xs text-text-muted">{medNames.join(", ")}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "lab_values",
      header: "Lab Values",
      render: (_v: unknown, row: Record<string, unknown>) => {
        const labs = row.lab_values as Array<{ name: string; value: unknown; unit: string }> | undefined;
        if (!labs?.length) return <span className="text-text-muted">—</span>;

        const displayText = labs.length > 1
          ? `${labs[0].name}: ${String(labs[0].value)} ${labs[0].unit} +${labs.length - 1}`
          : `${labs[0].name}: ${String(labs[0].value)} ${labs[0].unit}`;

        return (
          <div className="flex flex-col gap-1">
            <span className="text-xs">{displayText}</span>
            {labs.length > 1 && (
              <span className="text-xs text-text-muted">
                {labs.map((l) => `${l.name}: ${String(l.value)} ${l.unit}`).join(" • ")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      render: (_v: unknown, row: Record<string, unknown>) => (
        <button
          onClick={() => setDeleteConfirm(row._id as string)}
          className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
          title="Delete patient"
        >
          <Trash2 size={16} />
        </button>
      ),
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
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Download size={15} />}
          onClick={() => {
            if (patients.length > 0) {
              exportPatientsAsCSV(patients);
            }
          }}
        >
          Export CSV
        </Button>
      </motion.div>

      {/* Upload card */}
      <motion.div variants={itemVariants}>
        <Card>
          <DatasetUploader onUpload={handleUpload} />
          {uploadStatus && !isUploading && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 text-sm text-green-600"
            >
              <CheckCircle2 size={15} /> {uploadStatus}
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* Upload Progress Modal */}
      {isUploading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4"
          >
            <div className="text-center space-y-6">
              {/* Icon Animation */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 rounded-full bg-brand-purple-light flex items-center justify-center mx-auto"
              >
                <CheckCircle2 size={28} className="text-brand-purple" />
              </motion.div>

              {/* Title */}
              <div>
                <h3 className="text-lg font-bold text-text-primary mb-2">
                  Uploading Patient Data
                </h3>
                <p className="text-sm text-text-muted">
                  Processing medical records for clinical trial matching...
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    Progress
                  </span>
                  <span className="text-sm font-bold text-brand-purple">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-surface-muted rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-brand-purple to-brand-blue h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Status Message */}
              <div className="bg-surface-muted rounded-xl p-4">
                <p className="text-sm text-text-primary font-medium">{uploadStatus}</p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-xs text-blue-700 text-center">
                  ✓ Conditions, medications, and lab values are being extracted and stored
                  for trial matching
                </p>
              </div>

              {/* Cancel Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setUploadCancelled(true)}
                className="w-full !text-red-500 hover:!bg-red-50"
              >
                Cancel Upload
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {error && (
        <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirm(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-bold text-text-primary mb-2">
              Delete {deleteConfirm === "bulk" ? selectedPatients.size + " patient(s)" : "Patient"}?
            </h3>
            <p className="text-sm text-text-muted mb-6">
              {deleteConfirm === "bulk"
                ? `This will permanently delete ${selectedPatients.size} patient record(s) and all associated match results.`
                : "This will permanently delete this patient record and all associated match results."}
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (deleteConfirm === "bulk") {
                    handleBulkDelete();
                  } else {
                    handleDeleteSingle(deleteConfirm);
                  }
                }}
                className="flex-1 !text-red-500 hover:!bg-red-50"
              >
                Delete
              </Button>
            </div>
          </motion.div>
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
          {selectedPatients.size > 0 && (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Trash2 size={14} />}
              onClick={() => setDeleteConfirm("bulk")}
              className="!text-red-500 hover:!bg-red-50"
            >
              Delete ({selectedPatients.size})
            </Button>
          )}
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
