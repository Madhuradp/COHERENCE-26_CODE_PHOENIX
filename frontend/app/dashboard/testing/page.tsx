"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FlaskConical, Zap, CheckCircle2, AlertCircle, Activity, Download } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import {
  getAvailableTestData,
  getTestHistory,
  bulkValidateMatching,
  runDynamicTests,
  type AvailableTestData,
  type BulkValidationResponse,
  type TestRun,
} from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function TestingPage() {
  const [testData, setTestData] = useState<AvailableTestData | null>(null);
  const [testHistory, setTestHistory] = useState<TestRun[]>([]);
  const [bulkResults, setBulkResults] = useState<BulkValidationResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [testingRunning, setTestingRunning] = useState(false);
  const [bulkValidating, setBulkValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTestData();
  }, []);

  const loadTestData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, history] = await Promise.all([
        getAvailableTestData("Maharashtra"),
        getTestHistory(10),
      ]);
      setTestData(data);
      setTestHistory(history.test_runs || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load test data");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkValidate = async () => {
    setBulkValidating(true);
    setError(null);
    try {
      const result = await bulkValidateMatching({
        state: "Maharashtra",
        limit: 5,
      });
      setBulkResults(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setBulkValidating(false);
    }
  };

  const handleRunDynamicTests = async () => {
    setTestingRunning(true);
    setError(null);
    try {
      await runDynamicTests({
        state: "Maharashtra",
        limit_trials: 10,
        limit_patients: 5,
      });
      // Reload history
      const history = await getTestHistory(10);
      setTestHistory(history.test_runs || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test run failed");
    } finally {
      setTestingRunning(false);
    }
  };

  const downloadSamplePatientData = () => {
    // Sample patient data for CSV export
    const headers = ["Patient ID", "Age", "Gender", "Conditions", "Medications", "Lab Values"];
    const rows = [
      ["P001", "65", "M", "Type 2 Diabetes, Hypertension", "Metformin 500mg, Lisinopril 10mg", "Glucose 180, BP 140/90"],
      ["P002", "58", "F", "Breast Cancer Stage II", "Tamoxifen 20mg", "HER2 Positive"],
      ["P003", "72", "M", "Alzheimer's Disease, Hypertension", "Donepezil 10mg, Amlodipine 5mg", "MMSE 15"],
      ["P004", "45", "F", "Rheumatoid Arthritis", "Methotrexate 15mg", "CRP 8.5, ESR 22"],
      ["P005", "67", "M", "COPD, Heart Failure", "Tiotropium, Furosemide 40mg", "FEV1 45%, LVEF 35%"],
    ];

    let csv = headers.join(",") + "\n";
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_patients.csv";
    a.click();
  };

  const validationData = bulkResults
    ? [
        { name: "Eligible", value: bulkResults.summary.eligible, color: "#22C55E" },
        { name: "Ineligible", value: bulkResults.summary.ineligible, color: "#EF4444" },
        { name: "Review", value: bulkResults.summary.review_needed, color: "#F59E0B" },
      ]
    : [];

  const historyData = testHistory
    .slice(0, 5)
    .map((run) => ({
      timestamp: new Date(run.timestamp || "").toLocaleDateString(),
      eligible: run.total_eligible,
      ineligible: run.total_ineligible,
      review: run.total_review_needed,
    }))
    .reverse();

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
          <FlaskConical size={22} className="text-brand-purple" /> Dynamic Testing
        </h1>
        <p className="text-sm text-text-muted mt-0.5">Run comprehensive tests against available trial and patient data</p>
      </motion.div>

      {error && (
        <motion.div variants={itemVariants} className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {error}
        </motion.div>
      )}

      {testingRunning && <ProgressBar isLoading={true} label="Running dynamic tests..." />}
      {bulkValidating && <ProgressBar isLoading={true} label="Validating patient-trial combinations..." />}

      {/* Available Data Overview */}
      {loading ? (
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-surface-muted animate-pulse" />)}
        </motion.div>
      ) : testData ? (
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Available Trials", value: testData.available_trials, icon: FlaskConical, color: "text-blue-500", bg: "bg-blue-50" },
            { label: "Available Patients", value: testData.available_patients, icon: Activity, color: "text-purple-500", bg: "bg-purple-50" },
            { label: "Can Run Tests", value: testData.can_run_tests ? "Yes" : "No", icon: CheckCircle2, color: testData.can_run_tests ? "text-green-500" : "text-gray-500", bg: testData.can_run_tests ? "bg-green-50" : "bg-gray-50" },
            { label: "Test Data Status", value: "Ready", icon: Zap, color: "text-amber-500", bg: "bg-amber-50" },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl shadow-card p-5">
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center mb-3`}>
                <item.icon size={18} className={item.color} />
              </div>
              <p className="text-2xl font-bold text-text-primary">{String(item.value)}</p>
              <p className="text-xs text-text-muted mt-0.5">{item.label}</p>
            </div>
          ))}
        </motion.div>
      ) : null}

      {/* Test Controls */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Quick Validation */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Quick Validation</h3>
              <p className="text-xs text-text-muted mt-0.5">Test 5 random patient-trial combinations</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            fullWidth
            leftIcon={<CheckCircle2 size={15} />}
            loading={bulkValidating}
            onClick={handleBulkValidate}
            disabled={!testData?.can_run_tests}
          >
            {bulkValidating ? "Validating..." : "Run Quick Validation"}
          </Button>
          {bulkResults && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-xl bg-surface-muted"
            >
              <p className="text-xs font-semibold text-text-primary mb-3">Results Summary</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-green-600">{bulkResults.summary.eligible}</p>
                  <p className="text-xs text-text-muted">Eligible</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">{bulkResults.summary.review_needed}</p>
                  <p className="text-xs text-text-muted">Review</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{bulkResults.summary.ineligible}</p>
                  <p className="text-xs text-text-muted">Ineligible</p>
                </div>
              </div>
              <p className="text-xs text-text-primary mt-3">
                Avg Fit Score: <span className="font-bold">{bulkResults.summary.average_fit_score.toFixed(2)}</span>
              </p>
            </motion.div>
          )}
        </div>

        {/* Full Dynamic Tests */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Full Dynamic Tests</h3>
              <p className="text-xs text-text-muted mt-0.5">Test 10 trials × 5 patients comprehensively</p>
            </div>
          </div>
          <Button
            variant="primary"
            size="md"
            fullWidth
            leftIcon={<FlaskConical size={15} />}
            loading={testingRunning}
            onClick={handleRunDynamicTests}
            disabled={!testData?.can_run_tests}
          >
            {testingRunning ? "Testing..." : "Run Full Tests"}
          </Button>
          <p className="text-xs text-text-muted mt-4">
            Tests saved automatically to test history.
          </p>
        </div>
      </motion.div>

      {/* Bulk Validation Results Chart */}
      {bulkResults && validationData.some(d => d.value > 0) && (
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-card p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Quick Validation Results</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={validationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {validationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col justify-center gap-4">
              {bulkResults.validations.slice(0, 5).map((val, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-surface-muted">
                  <div className="text-sm text-text-primary">
                    <span className="font-medium">{val.trial_id}</span>
                    <p className="text-xs text-text-muted">{val.patient_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                      val.eligibility === "ELIGIBLE" ? "bg-green-100 text-green-700" :
                      val.eligibility === "INELIGIBLE" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {val.eligibility}
                    </span>
                    <span className="text-xs font-bold text-text-primary">{val.fit_score.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Test History */}
      {testHistory.length > 0 && historyData.length > 0 && (
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-card p-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Test History</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="timestamp" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0", fontSize: 12 }} />
              <Line type="monotone" dataKey="eligible" stroke="#22C55E" strokeWidth={2} name="Eligible" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="review" stroke="#F59E0B" strokeWidth={2} name="Review Needed" dot={{ r: 4 }} />
              <Line type="monotone" dataKey="ineligible" stroke="#EF4444" strokeWidth={2} name="Ineligible" dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Data Export */}
      <motion.div variants={itemVariants} className="bg-gradient-to-r from-brand-purple/5 to-blue-500/5 rounded-2xl shadow-card p-6 border border-brand-purple/20">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Export Sample Test Data</h3>
            <p className="text-xs text-text-muted mt-0.5">Download sample patient CSV for testing and demonstration</p>
          </div>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Download size={15} />}
            onClick={downloadSamplePatientData}
          >
            Download CSV
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
