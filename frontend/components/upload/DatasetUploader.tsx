"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, X, CheckCircle, Download, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { clsx } from "clsx";

interface UploadedFile {
  file: File;
  preview: string[][];
  status: "uploading" | "success" | "error";
  error?: string;
}

interface DatasetUploaderProps {
  onUpload?: (file: File, preview: string[][]) => void;
}

const SAMPLE_CSV_HEADERS = [
  "patient_id",
  "age",
  "gender",
  "disease",
  "medications",
  "HbA1c",
  "cholesterol",
  "glucose",
  "blood_pressure",
  "location",
];

const SAMPLE_CSV_ROWS = [
  ["P001", "52", "M", "Diabetes", "Metformin", "8.5", "195", "140", "130/85", "Mumbai"],
  ["P002", "47", "F", "Hypertension", "Amlodipine", "5.8", "210", "95", "145/92", "Delhi"],
  ["P003", "61", "M", "Asthma", "Salbutamol", "5.2", "180", "88", "120/78", "Pune"],
];

function parseCsvPreview(text: string): string[][] {
  const lines = text.trim().split("\n").slice(0, 6);
  return lines.map((line) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
  );
}

function downloadSampleCsv() {
  const rows = [SAMPLE_CSV_HEADERS, ...SAMPLE_CSV_ROWS];
  const csv = rows.map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample_patients.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function DatasetUploader({ onUpload }: DatasetUploaderProps) {
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!file.name.endsWith(".csv")) {
        setUploaded({
          file,
          preview: [],
          status: "error",
          error: "Only CSV files are supported.",
        });
        return;
      }

      setUploaded({ file, preview: [], status: "uploading" });

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const preview = parseCsvPreview(text);
        setTimeout(() => {
          setUploaded({ file, preview, status: "success" });
          onUpload?.(file, preview);
        }, 800);
      };
      reader.readAsText(file);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    multiple: false,
  });

  const clearUpload = () => setUploaded(null);

  return (
    <div className="flex flex-col gap-5">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Upload Patient Dataset</h3>
          <p className="text-xs text-text-muted mt-0.5">
            CSV file with patient health records
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Download size={14} />}
          onClick={downloadSampleCsv}
        >
          Download Sample CSV
        </Button>
      </div>

      {/* Dropzone */}
      <AnimatePresence mode="wait">
        {!uploaded ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            {...getRootProps()}
            className={clsx(
              "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200",
              isDragActive
                ? "border-brand-purple bg-brand-purple-light/50"
                : "border-surface-border hover:border-brand-purple/50 hover:bg-brand-purple-light/20"
            )}
          >
            <input {...getInputProps()} />
            <motion.div
              animate={isDragActive ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="w-14 h-14 rounded-2xl bg-brand-purple-light flex items-center justify-center"
            >
              <UploadCloud className="text-brand-purple" size={28} />
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-semibold text-text-primary">
                {isDragActive ? "Drop your CSV file here" : "Drag & drop your CSV file"}
              </p>
              <p className="text-xs text-text-muted mt-1">
                or{" "}
                <span className="text-brand-purple font-medium cursor-pointer hover:underline">
                  browse to upload
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {SAMPLE_CSV_HEADERS.slice(0, 5).map((h) => (
                <span key={h} className="badge bg-surface-muted text-text-muted">
                  {h}
                </span>
              ))}
              <span className="badge bg-surface-muted text-text-muted">+5 more</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="uploaded"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border border-surface-border rounded-2xl overflow-hidden"
          >
            {/* File info bar */}
            <div className="flex items-center gap-3 px-4 py-3 bg-surface-muted border-b border-surface-border">
              <div className="w-9 h-9 rounded-xl bg-brand-purple-light flex items-center justify-center flex-shrink-0">
                {uploaded.status === "error" ? (
                  <AlertCircle className="text-red-500" size={18} />
                ) : uploaded.status === "uploading" ? (
                  <FileText className="text-brand-purple animate-pulse" size={18} />
                ) : (
                  <CheckCircle className="text-emerald-500" size={18} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {uploaded.file.name}
                </p>
                <p className="text-xs text-text-muted">
                  {uploaded.status === "uploading"
                    ? "Processing..."
                    : uploaded.status === "error"
                    ? uploaded.error
                    : `${(uploaded.file.size / 1024).toFixed(1)} KB · ${
                        uploaded.preview.length > 0
                          ? `${uploaded.preview.length - 1} rows`
                          : ""
                      }`}
                </p>
              </div>
              <button
                onClick={clearUpload}
                className="p-1 rounded-lg hover:bg-surface-border text-text-muted hover:text-text-primary transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Preview table */}
            {uploaded.status === "success" && uploaded.preview.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-surface-border">
                      {uploaded.preview[0].map((h, i) => (
                        <th
                          key={i}
                          className="px-3 py-2.5 text-left font-semibold text-text-muted uppercase tracking-wider bg-surface-muted/50 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploaded.preview.slice(1).map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-b border-surface-border last:border-0 hover:bg-surface-muted/50 transition-colors"
                      >
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2.5 text-text-primary whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Loading state */}
            {uploaded.status === "uploading" && (
              <div className="p-6 flex items-center justify-center gap-3">
                <div className="w-5 h-5 rounded-full border-2 border-brand-purple border-t-transparent animate-spin" />
                <span className="text-sm text-text-muted">Parsing dataset...</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
