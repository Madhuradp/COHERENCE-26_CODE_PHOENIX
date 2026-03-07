'use client';

import React, { useState } from 'react';
import { AlertCircle, Play, RotateCcw } from 'lucide-react';
import TrialMatchResults from './TrialMatchResults';
import { useTrialMatching } from '@/lib/hooks/useTrialMatching';

/**
 * Clinical Trial Matching Page Component
 *
 * Features:
 * - Search for patient by ID
 * - Run matching pipeline with state filter
 * - Display detailed inclusion/exclusion criteria
 * - Show confidence scores and trial details
 */
const MatchingPage: React.FC = () => {
  const [patientId, setPatientId] = useState('');
  const [stateFilter, setStateFilter] = useState('Maharashtra');
  const [submitted, setSubmitted] = useState(false);

  const {
    matches,
    loading,
    error,
    patientAge,
    patientGender,
    stateFilter: responseStateFilter,
    totalMatches,
    runMatching,
    clearMatches,
  } = useTrialMatching();

  const handleRunMatching = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId.trim()) {
      alert('Please enter a patient ID');
      return;
    }

    setSubmitted(true);
    await runMatching(patientId, stateFilter);
  };

  const handleReset = () => {
    setPatientId('');
    setStateFilter('Maharashtra');
    setSubmitted(false);
    clearMatches();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Clinical Trial Matching</h1>
          <p className="text-gray-600">
            Find suitable clinical trials based on patient health records and eligibility criteria
          </p>
        </div>

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Find Matching Trials</h2>

          <form onSubmit={handleRunMatching} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Patient ID Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient ID
                </label>
                <input
                  type="text"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="e.g., 507f1f77bcf86cd799439011"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the MongoDB ObjectId of the patient
                </p>
              </div>

              {/* State Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location Filter
                </label>
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="Telangana">Telangana</option>
                  <option value="all">All States</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Filter trials by geographic location
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading || !patientId.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-4 h-4" />
                {loading ? 'Running...' : 'Run Matching'}
              </button>

              {submitted && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              )}
            </div>
          </form>
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

        {/* Results */}
        {submitted && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Analyzing patient health records...</p>
                <p className="text-sm text-gray-500 mt-2">
                  Comparing against {stateFilter} clinical trials
                </p>
              </div>
            ) : matches.length > 0 ? (
              <TrialMatchResults
                matches={matches}
                patientAge={patientAge}
                patientGender={patientGender}
                stateFilter={responseStateFilter}
                totalMatches={totalMatches}
              />
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">
                  {error ? 'Unable to load matching results' : 'No matching trials found'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info Section */}
        {!submitted && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Features */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Features</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="text-blue-600">✓</span>
                  Smart geographic filtering by state
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">✓</span>
                  Detailed inclusion/exclusion criteria evaluation
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">✓</span>
                  Confidence scoring and ranking
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">✓</span>
                  Transparent eligibility determination
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">✓</span>
                  Patient anonymization and privacy protection
                </li>
              </ul>
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">How It Works</h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li>
                  <span className="font-semibold">1. Enter Patient ID</span>
                  <p className="text-xs text-gray-600">Patient health records are anonymized</p>
                </li>
                <li>
                  <span className="font-semibold">2. Filter by Location</span>
                  <p className="text-xs text-gray-600">Select state to narrow down trials</p>
                </li>
                <li>
                  <span className="font-semibold">3. Run Analysis</span>
                  <p className="text-xs text-gray-600">System evaluates inclusion/exclusion criteria</p>
                </li>
                <li>
                  <span className="font-semibold">4. Review Results</span>
                  <p className="text-xs text-gray-600">See detailed eligibility breakdown</p>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchingPage;
