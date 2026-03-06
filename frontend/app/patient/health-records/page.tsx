"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  HeartPulse, Save, CheckCircle, UploadCloud, FileText, X, ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { uploadPatient } from "@/lib/api";
import { useAuth } from "@/lib/authContext";

const healthSchema = z.object({
  age: z.coerce.number().min(1).max(120),
  gender: z.string().min(1, "Gender is required"),
  location: z.string().min(2, "Location is required"),
  disease: z.string().min(2, "Diagnosis is required"),
  medications: z.string().optional(),
  smokingStatus: z.enum(["non-smoker", "former-smoker", "smoker"]),
  bmi: z.coerce.number().min(10).max(80),
  HbA1c: z.coerce.number().min(0).max(20),
  cholesterol: z.coerce.number().min(0),
  glucose: z.coerce.number().min(0),
  blood_pressure: z.string().min(3),
});

type HealthForm = z.infer<typeof healthSchema>;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

interface UploadedFile {
  file: File;
  status: "ready";
}

export default function HealthRecordsPage() {
  const router = useRouter();
  const auth = useAuth();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<HealthForm>({
    resolver: zodResolver(healthSchema),
    defaultValues: { smokingStatus: "non-smoker" },
  });

  const buildPatientPayload = (data: HealthForm) => ({
    demographics: { age: data.age, gender: data.gender, location: data.location },
    conditions: [{ name: data.disease }],
    medications: data.medications
      ? data.medications.split(",").map((m) => ({ name: m.trim() })).filter((m) => m.name)
      : [],
    lab_values: [
      { name: "HbA1c", value: data.HbA1c, unit: "%" },
      { name: "Cholesterol", value: data.cholesterol, unit: "mg/dL" },
      { name: "Glucose", value: data.glucose, unit: "mg/dL" },
      { name: "Blood Pressure", value: data.blood_pressure, unit: "mmHg" },
      { name: "BMI", value: data.bmi, unit: "kg/m2" },
      { name: "Smoking Status", value: data.smokingStatus, unit: "" },
    ],
    patient_email: auth.user?.email,
  });

  const onSubmit = async (data: HealthForm) => {
    setSaving(true);
    setApiError(null);
    try {
      const res = await uploadPatient(buildPatientPayload(data));
      if (res.data?.id) auth.setPatientId(res.data.id);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : "Failed to save health records");
    } finally {
      setSaving(false);
    }
  };

  const handleCheckEligibility = () => {
    handleSubmit(async (data) => {
      setSaving(true);
      setApiError(null);
      try {
        const res = await uploadPatient(buildPatientPayload(data));
        if (res.data?.id) auth.setPatientId(res.data.id);
        router.push("/patient/matching");
      } catch (e: unknown) {
        setApiError(e instanceof Error ? e.message : "Failed to save health records");
        setSaving(false);
      }
    })();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"], "image/*": [".png", ".jpg", ".jpeg"] },
    multiple: true,
    onDrop: (files) => {
      setUploadedFiles((prev) => [
        ...prev,
        ...files.map((f) => ({ file: f, status: "ready" as const })),
      ]);
    },
  });

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
            <HeartPulse size={22} className="text-blue-600" /> Health Records
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Your medical information is used to find matching clinical trials. All data is encrypted.
          </p>
        </div>
        {saved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl"
          >
            <CheckCircle size={14} /> Records saved successfully
          </motion.div>
        )}
      </motion.div>

      {apiError && (
        <motion.div
          variants={itemVariants}
          className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600"
        >
          {apiError}
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Demographics */}
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-surface-border">
              <div className="w-9 h-9 rounded-xl bg-brand-purple-light flex items-center justify-center">
                <HeartPulse size={17} className="text-brand-purple" />
              </div>
              <div>
                <h2 className="font-bold text-text-primary text-sm">Demographics</h2>
                <p className="text-xs text-text-muted">Basic personal information</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Age" type="number" placeholder="e.g. 52" error={errors.age?.message} {...register("age")} />
              <Select
                label="Gender"
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Other", label: "Other" },
                  { value: "Prefer not to say", label: "Prefer not to say" },
                ]}
                error={errors.gender?.message}
                {...register("gender")}
              />
              <Input label="Location / City" placeholder="e.g. Mumbai" error={errors.location?.message} {...register("location")} />
            </div>
          </Card>
        </motion.div>

        {/* Health Information */}
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-surface-border">
              <div className="w-9 h-9 rounded-xl bg-brand-blue-light flex items-center justify-center">
                <HeartPulse size={17} className="text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-text-primary text-sm">Health Information</h2>
                <p className="text-xs text-text-muted">Diagnosis and current health status</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Disease / Diagnosis" placeholder="e.g. Type 2 Diabetes" error={errors.disease?.message} {...register("disease")} />
              <Input label="Current Medications" placeholder="e.g. Metformin 500mg, Insulin" {...register("medications")} />
              <Select
                label="Smoking Status"
                options={[
                  { value: "non-smoker", label: "Non-smoker" },
                  { value: "former-smoker", label: "Former smoker" },
                  { value: "smoker", label: "Smoker" },
                ]}
                error={errors.smokingStatus?.message}
                {...register("smokingStatus")}
              />
              <Input label="BMI" type="number" step="0.1" placeholder="e.g. 27.4" error={errors.bmi?.message} {...register("bmi")} />
            </div>
          </Card>
        </motion.div>

        {/* Lab Results */}
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-surface-border">
              <div className="w-9 h-9 rounded-xl bg-brand-orange-light flex items-center justify-center">
                <HeartPulse size={17} className="text-orange-600" />
              </div>
              <div>
                <h2 className="font-bold text-text-primary text-sm">Lab Results</h2>
                <p className="text-xs text-text-muted">Latest blood work and diagnostic values</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Input label="HbA1c (%)" type="number" step="0.1" placeholder="e.g. 8.5" error={errors.HbA1c?.message} hint="Glycated haemoglobin" {...register("HbA1c")} />
              <Input label="Cholesterol (mg/dL)" type="number" placeholder="e.g. 195" error={errors.cholesterol?.message} {...register("cholesterol")} />
              <Input label="Glucose (mg/dL)" type="number" placeholder="e.g. 140" error={errors.glucose?.message} {...register("glucose")} />
              <Input label="Blood Pressure" placeholder="e.g. 130/85" error={errors.blood_pressure?.message} hint="Systolic/Diastolic" {...register("blood_pressure")} />
            </div>
          </Card>
        </motion.div>

        {/* Medical Report Upload */}
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-surface-border">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <UploadCloud size={17} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="font-bold text-text-primary text-sm">Medical Reports</h2>
                <p className="text-xs text-text-muted">
                  Upload lab reports, doctor diagnosis, medical history (PDF, JPG, PNG)
                </p>
              </div>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 ${
                isDragActive
                  ? "border-blue-400 bg-brand-blue-light/30"
                  : "border-surface-border hover:border-blue-300 hover:bg-brand-blue-light/10"
              }`}
            >
              <input {...getInputProps()} />
              <motion.div
                animate={isDragActive ? { scale: 1.1, y: -4 } : { scale: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="w-12 h-12 rounded-2xl bg-brand-blue-light flex items-center justify-center"
              >
                <UploadCloud size={22} className="text-blue-600" />
              </motion.div>
              <div className="text-center">
                <p className="text-sm font-semibold text-text-primary">
                  {isDragActive ? "Drop files here" : "Drag & drop medical reports"}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  or <span className="text-blue-600 font-medium cursor-pointer hover:underline">browse to upload</span>
                </p>
                <p className="text-xs text-text-muted mt-1">PDF, JPG, PNG up to 10MB each</p>
              </div>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="flex flex-col gap-2 mt-3">
                {uploadedFiles.map((uf, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-muted">
                    <FileText size={15} className="text-blue-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-text-primary flex-1 truncate">{uf.file.name}</span>
                    <span className="text-xs text-text-muted">{(uf.file.size / 1024).toFixed(0)} KB</span>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles((p) => p.filter((_, idx) => idx !== i))}
                      className="p-1 rounded-lg hover:bg-surface-border text-text-muted transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Actions */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 justify-end">
          <Button type="submit" variant="secondary" size="md" loading={saving} leftIcon={<Save size={15} />}>
            Save Health Records
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            rightIcon={<ArrowRight size={15} />}
            loading={saving}
            onClick={handleCheckEligibility}
          >
            Check Clinical Trial Eligibility
          </Button>
        </motion.div>
      </form>
    </motion.div>
  );
}
