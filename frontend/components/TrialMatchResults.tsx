'use client';

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Zap,
  FileText,
  Award,
} from 'lucide-react';

interface CriterionItem {
  criterion: string;
  patient_value?: any;
  patient_has?: boolean;
  patient_status?: string;
  status: 'MET' | 'NOT_MET' | 'NOT_EXCLUDED' | 'EXCLUDED' | 'REVIEW_NEEDED';
  type?: string;
}

interface TrialMatch {
  nct_id: string;
  title: string;
  brief_title?: string;
  phase?: string;
  sponsor?: string;
  conditions?: string[];
  inclusion_criteria: CriterionItem[];
  exclusion_criteria: CriterionItem[];
  overall_eligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_NEEDED';
  confidence_score: number;
  semantic_score: number;
  distance_km: number;
  explanation?: string;
}

interface TrialMatchResultsProps {
  matches: TrialMatch[];
  patientAge?: number;
  patientGender?: string;
  stateFilter?: string;
  totalMatches?: number;
  loading?: boolean;
}

const TrialMatchResults: React.FC<TrialMatchResultsProps> = ({
  matches,
  patientAge,
  patientGender,
  stateFilter,
  totalMatches,
  loading = false,
}) => {
  const [expandedTrials, setExpandedTrials] = useState<Set<string>>(new Set());

  const toggleTrial = (nctId: string) => {
    const newExpanded = new Set(expandedTrials);
    if (newExpanded.has(nctId)) {
      newExpanded.delete(nctId);
    } else {
      newExpanded.add(nctId);
    }
    setExpandedTrials(newExpanded);
  };

  const getEligibilityColor = (status: string) => {
    switch (status) {
      case 'ELIGIBLE':
        return 'text-green-600';
      case 'INELIGIBLE':
        return 'text-red-600';
      case 'REVIEW_NEEDED':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getEligibilityBgColor = (status: string) => {
    switch (status) {
      case 'ELIGIBLE':
        return 'bg-green-50 border-green-200';
      case 'INELIGIBLE':
        return 'bg-red-50 border-red-200';
      case 'REVIEW_NEEDED':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getCriterionIcon = (status: string) => {
    switch (status) {
      case 'MET':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'NOT_MET':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'NOT_EXCLUDED':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'EXCLUDED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-8 h-8 text-blue-600 mx-auto mb-2" />
        <p className="text-blue-800">No matching trials found for the given criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Match Results</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {patientAge && (
            <div>
              <p className="text-sm text-gray-600">Patient Age</p>
              <p className="text-lg font-semibold text-gray-800">{patientAge} years</p>
            </div>
          )}
          {patientGender && (
            <div>
              <p className="text-sm text-gray-600">Gender</p>
              <p className="text-lg font-semibold text-gray-800">{patientGender}</p>
            </div>
          )}
          {stateFilter && (
            <div>
              <p className="text-sm text-gray-600">Location Filter</p>
              <p className="text-lg font-semibold text-gray-800">{stateFilter}</p>
            </div>
          )}
          {totalMatches !== undefined && (
            <div>
              <p className="text-sm text-gray-600">Total Matches</p>
              <p className="text-lg font-semibold text-gray-800">{totalMatches}</p>
            </div>
          )}
        </div>
      </div>

      {/* Trial Matches */}
      <div className="space-y-3">
        {matches.map((trial, idx) => {
          const isExpanded = expandedTrials.has(trial.nct_id);
          const eligibilityColor = getEligibilityColor(trial.overall_eligibility);
          const eligibilityBg = getEligibilityBgColor(trial.overall_eligibility);

          const inclMet = trial.inclusion_criteria.filter((c) => c.status === 'MET').length;
          const inclTotal = trial.inclusion_criteria.length;
          const exclNotExcluded = trial.exclusion_criteria.filter(
            (c) => c.status === 'NOT_EXCLUDED'
          ).length;
          const exclTotal = trial.exclusion_criteria.length;

          return (
            <div
              key={trial.nct_id}
              className={`border rounded-lg overflow-hidden transition-all ${eligibilityBg}`}
            >
              {/* Trial Header - Always Visible */}
              <button
                onClick={() => toggleTrial(trial.nct_id)}
                className="w-full p-4 hover:bg-opacity-75 transition-colors text-left"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left Side - Trial Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xs font-mono bg-gray-200 text-gray-700 px-2 py-1 rounded flex-shrink-0">
                        {trial.nct_id}
                      </span>
                      {trial.phase && (
                        <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded flex-shrink-0">
                          {trial.phase}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-800 text-base mb-1 truncate">
                      {trial.title || trial.brief_title}
                    </h3>
                    {trial.sponsor && (
                      <p className="text-xs text-gray-600">Sponsor: {trial.sponsor}</p>
                    )}
                  </div>

                  {/* Right Side - Eligibility Status & Scores */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      {trial.overall_eligibility === 'ELIGIBLE' && (
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      )}
                      {trial.overall_eligibility === 'INELIGIBLE' && (
                        <XCircle className="w-6 h-6 text-red-600" />
                      )}
                      {trial.overall_eligibility === 'REVIEW_NEEDED' && (
                        <AlertCircle className="w-6 h-6 text-yellow-600" />
                      )}
                      <span className={`font-bold text-sm ${eligibilityColor}`}>
                        {trial.overall_eligibility}
                      </span>
                    </div>

                    {/* Score Badge */}
                    <div className="bg-white bg-opacity-60 rounded px-2 py-1">
                      <p className="text-xs text-gray-700">
                        <span className="font-semibold">{Math.round(trial.confidence_score * 100)}%</span>{' '}
                        confidence
                      </p>
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                </div>

                {/* Quick Summary Line */}
                <div className="flex gap-4 mt-3 text-xs">
                  <div className="text-gray-700">
                    📋 Inclusions: {inclMet}/{inclTotal} met
                  </div>
                  <div className="text-gray-700">
                    ✓ Exclusions: {exclNotExcluded}/{exclTotal} clear
                  </div>
                  {trial.distance_km && (
                    <div className="text-gray-700 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {trial.distance_km.toFixed(1)} km
                    </div>
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-opacity-30 border-gray-400 bg-white bg-opacity-50 p-4 space-y-4">
                  {/* Explanation */}
                  {trial.explanation && (
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Note:</span> {trial.explanation}
                      </p>
                    </div>
                  )}

                  {/* Conditions */}
                  {trial.conditions && trial.conditions.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-gray-800 mb-2">Medical Conditions:</p>
                      <div className="flex flex-wrap gap-2">
                        {trial.conditions.map((condition, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                          >
                            {condition}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Inclusion Criteria */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Inclusion Criteria
                    </h4>
                    <div className="space-y-2">
                      {trial.inclusion_criteria.map((criterion, idx) => (
                        <CriterionRow key={idx} criterion={criterion} />
                      ))}
                    </div>
                  </div>

                  {/* Exclusion Criteria */}
                  {trial.exclusion_criteria.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        Exclusion Criteria
                      </h4>
                      <div className="space-y-2">
                        {trial.exclusion_criteria.map((criterion, idx) => (
                          <CriterionRow key={idx} criterion={criterion} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Score Details */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                    <div className="bg-white rounded p-2">
                      <p className="text-xs text-gray-600">Confidence Score</p>
                      <p className="text-lg font-bold text-blue-600">
                        {Math.round(trial.confidence_score * 100)}%
                      </p>
                    </div>
                    <div className="bg-white rounded p-2">
                      <p className="text-xs text-gray-600">Semantic Score</p>
                      <p className="text-lg font-bold text-purple-600">
                        {trial.semantic_score?.toFixed(2) || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper Component: Criterion Row
const CriterionRow: React.FC<{ criterion: CriterionItem }> = ({ criterion }) => {
  const icon = criterion.status === 'MET' || criterion.status === 'NOT_EXCLUDED'
    ? <CheckCircle className="w-4 h-4 text-green-600" />
    : <XCircle className="w-4 h-4 text-red-600" />;

  return (
    <div className="flex items-start gap-3 bg-white rounded p-2 text-sm">
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-800 font-medium">{criterion.criterion}</p>
        {criterion.patient_value !== undefined && criterion.patient_value !== null && (
          <p className="text-xs text-gray-600">
            Your value: <span className="font-mono font-semibold">{criterion.patient_value}</span>
          </p>
        )}
        {criterion.patient_has !== undefined && (
          <p className="text-xs text-gray-600">
            Your status: <span className="font-semibold">
              {criterion.patient_has ? 'Yes' : 'No'}
            </span>
          </p>
        )}
        {criterion.patient_status && (
          <p className="text-xs text-gray-600">
            Your status: <span className="font-semibold">{criterion.patient_status}</span>
          </p>
        )}
      </div>
    </div>
  );
};

export default TrialMatchResults;
