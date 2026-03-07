'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  TrendingUp,
  Users,
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  Download,
  Info,
} from 'lucide-react';

interface TestResult {
  patient_id: string;
  patient_age?: number;
  patient_gender?: string;
  trial_id: string;
  trial_title: string;
  trial_phase?: string;
  overall_eligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_NEEDED';
  fit_score?: { overall_fit: number };
  status: 'PASSED' | 'FAILED';
  error?: string;
}

interface TestRunSummary {
  total_test_cases: number;
  passed: number;
  eligible_matches: number;
  ineligible_matches: number;
  review_needed: number;
}

interface TestStatistics {
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  pass_rate: number;
  fit_scores: {
    average: number;
    min: number;
    max: number;
  };
  eligibility_breakdown?: {
    eligible: number;
    ineligible: number;
    review_needed: number;
  };
}

interface AvailableData {
  available_trials: number;
  available_patients: number;
  state_filter: string;
  can_run_tests: boolean;
}

const DynamicTestingDashboard: React.FC = () => {
  // State for test configuration
  const [state, setState] = useState('Maharashtra');
  const [limitTrials, setLimitTrials] = useState(10);
  const [limitPatients, setLimitPatients] = useState(5);

  // State for test execution
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for results
  const [availableData, setAvailableData] = useState<AvailableData | null>(null);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [testSummary, setTestSummary] = useState<TestRunSummary | null>(null);
  const [testStatistics, setTestStatistics] = useState<TestStatistics | null>(null);

  // Load available data on component mount
  useEffect(() => {
    fetchAvailableData();
  }, [state]);

  const fetchAvailableData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/test/available-data?state=${encodeURIComponent(state)}`
      );
      const data = await response.json();
      setAvailableData(data);
      setError(null);
    } catch (err) {
      setError(`Failed to load available data: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const runDynamicTests = async () => {
    try {
      setTesting(true);
      setError(null);

      const response = await fetch(
        `/api/test/run-dynamic-tests?state=${encodeURIComponent(state)}&limit_trials=${limitTrials}&limit_patients=${limitPatients}`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Test execution failed');
        return;
      }

      // Update state with results
      setTestResults(data.test_cases || []);
      setTestSummary(data.summary);
      setTestStatistics(data.statistics);
    } catch (err) {
      setError(`Test execution failed: ${err}`);
    } finally {
      setTesting(false);
    }
  };

  const runBulkValidation = async () => {
    try {
      setTesting(true);
      setError(null);

      const response = await fetch(
        `/api/test/bulk-validate?state=${encodeURIComponent(state)}&limit=${limitPatients}`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Validation failed');
        return;
      }

      // Transform bulk validation results for display
      setTestResults(
        data.validations.map((v: any) => ({
          patient_id: v.patient_id,
          trial_id: v.trial_id,
          overall_eligibility: v.eligibility,
          fit_score: { overall_fit: v.fit_score },
          status: 'PASSED',
        }))
      );
    } catch (err) {
      setError(`Validation failed: ${err}`);
    } finally {
      setTesting(false);
    }
  };

  const downloadResults = () => {
    const dataStr = JSON.stringify({
      summary: testSummary,
      statistics: testStatistics,
      results: testResults,
    }, null, 2);

    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `test-results-${new Date().toISOString()}.json`;
    link.click();
  };

  const resetTests = () => {
    setTestResults([]);
    setTestSummary(null);
    setTestStatistics(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Dynamic Testing Dashboard
          </h1>
          <p className="text-gray-600">
            Automatically test matching pipeline against all available clinical trials and patient data
          </p>
        </div>

        {/* Configuration Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* State Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State Filter
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={testing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi">Delhi</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Telangana">Telangana</option>
                <option value="all">All States</option>
              </select>
            </div>

            {/* Limit Trials */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Trials
              </label>
              <input
                type="number"
                value={limitTrials}
                onChange={(e) => setLimitTrials(parseInt(e.target.value))}
                disabled={testing}
                min="1"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Limit Patients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Patients
              </label>
              <input
                type="number"
                value={limitPatients}
                onChange={(e) => setLimitPatients(parseInt(e.target.value))}
                disabled={testing}
                min="1"
                max="50"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Available Data Info */}
          {availableData && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold">Available Data</p>
                  <p>
                    {availableData.available_trials} trials × {availableData.available_patients} patients =
                    {availableData.available_trials * availableData.available_patients} test cases
                  </p>
                  {!availableData.can_run_tests && (
                    <p className="mt-2 text-red-600">
                      ⚠️ Insufficient data to run tests. Upload patient data and/or load trials.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={runDynamicTests}
              disabled={testing || !availableData?.can_run_tests}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Full Tests
                </>
              )}
            </button>

            <button
              onClick={runBulkValidation}
              disabled={testing || !availableData?.can_run_tests}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  Quick Validation
                </>
              )}
            </button>

            {testResults.length > 0 && (
              <>
                <button
                  onClick={downloadResults}
                  className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Results
                </button>

                <button
                  onClick={resetTests}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Results Section */}
        {testResults.length > 0 && (
          <>
            {/* Summary Cards */}
            {testSummary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <MetricCard
                  label="Total Tests"
                  value={testSummary.total_test_cases}
                  icon={<ClipboardList className="w-5 h-5" />}
                  color="bg-blue-50 text-blue-600"
                />
                <MetricCard
                  label="Eligible"
                  value={testSummary.eligible_matches}
                  icon={<CheckCircle className="w-5 h-5" />}
                  color="bg-green-50 text-green-600"
                />
                <MetricCard
                  label="Ineligible"
                  value={testSummary.ineligible_matches}
                  icon={<XCircle className="w-5 h-5" />}
                  color="bg-red-50 text-red-600"
                />
                <MetricCard
                  label="Review Needed"
                  value={testSummary.review_needed}
                  icon={<AlertCircle className="w-5 h-5" />}
                  color="bg-yellow-50 text-yellow-600"
                />
                {testStatistics && (
                  <MetricCard
                    label="Pass Rate"
                    value={`${testStatistics.pass_rate}%`}
                    icon={<TrendingUp className="w-5 h-5" />}
                    color="bg-purple-50 text-purple-600"
                  />
                )}
              </div>
            )}

            {/* Statistics */}
            {testStatistics && (
              <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Test Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatBox
                    label="Tests Passed"
                    value={testStatistics.passed_tests}
                    total={testStatistics.total_tests}
                  />
                  <StatBox
                    label="Fit Score (Average)"
                    value={testStatistics.fit_scores.average.toFixed(1)}
                    unit="%"
                  />
                  <StatBox
                    label="Fit Score Range"
                    value={`${testStatistics.fit_scores.min} - ${testStatistics.fit_scores.max}%`}
                  />
                </div>
              </div>
            )}

            {/* Detailed Results Table */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Test Results ({testResults.length} total)
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Patient
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Trial
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Phase
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Eligibility
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Fit Score
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.slice(0, 20).map((result, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">
                          <div className="text-xs">
                            <p className="font-semibold">Age: {result.patient_age}</p>
                            <p className="text-gray-500">{result.patient_gender}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700 max-w-xs truncate">
                          {result.trial_title}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{result.trial_phase}</td>
                        <td className="px-4 py-3">
                          <EligibilityBadge status={result.overall_eligibility} />
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {result.fit_score?.overall_fit || 'N/A'}%
                        </td>
                        <td className="px-4 py-3">
                          {result.status === 'PASSED' ? (
                            <span className="text-green-600 font-semibold">✓ Passed</span>
                          ) : (
                            <span className="text-red-600 font-semibold">✗ Failed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {testResults.length > 20 && (
                <div className="mt-4 text-center text-gray-600">
                  Showing 20 of {testResults.length} results
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty State */}
        {testResults.length === 0 && !testing && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Tests Run Yet</h3>
            <p className="text-gray-600 mb-4">
              Click "Run Full Tests" or "Quick Validation" to start testing against available data
            </p>
            {availableData && (
              <p className="text-sm text-gray-500">
                {availableData.available_trials} trials and {availableData.available_patients} patients
                available
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components

interface MetricCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, icon, color }) => (
  <div className={`${color} rounded-lg p-4 border border-current border-opacity-20`}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-semibold opacity-75">{label}</p>
      {icon}
    </div>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

interface StatBoxProps {
  label: string;
  value: string | number;
  total?: number;
  unit?: string;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value, total, unit }) => (
  <div className="bg-gray-50 rounded p-4 border border-gray-200">
    <p className="text-sm text-gray-600 mb-2">{label}</p>
    <p className="text-2xl font-bold text-gray-800">
      {value}
      {unit}
    </p>
    {total && <p className="text-xs text-gray-500 mt-1">of {total} tests</p>}
  </div>
);

interface EligibilityBadgeProps {
  status: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_NEEDED';
}

const EligibilityBadge: React.FC<EligibilityBadgeProps> = ({ status }) => {
  const styles = {
    ELIGIBLE: 'bg-green-100 text-green-800',
    INELIGIBLE: 'bg-red-100 text-red-800',
    REVIEW_NEEDED: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${styles[status]}`}>
      {status}
    </span>
  );
};

export default DynamicTestingDashboard;
