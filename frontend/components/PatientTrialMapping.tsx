'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Info,
  Zap,
  Activity,
  Pill,
  Microscope,
  Users,
  Heart,
  AlertCircle,
} from 'lucide-react';

interface PatientData {
  age?: number;
  gender?: string;
  conditions?: Array<{ name: string; status?: string }>;
  medications?: Array<{ name: string; dosage?: string }>;
  lab_values?: Array<{ test_name: string; value: number; unit?: string }>;
  pregnancy_status?: string;
  nursing_status?: string;
  performance_status?: number;
}

interface TrialCriteria {
  trial_id: string;
  trial_title: string;
  phase?: string;
  sponsor?: string;
  eligibility_criteria?: any;
}

interface Criterion {
  criterion: string;
  patient_value?: any;
  patient_has?: boolean;
  patient_status?: string;
  status: 'MET' | 'NOT_MET' | 'NOT_EXCLUDED' | 'EXCLUDED';
  type?: string;
}

interface MatchingAnalysis {
  patient_data: PatientData;
  trial_criteria: TrialCriteria;
  inclusion_criteria: Criterion[];
  exclusion_criteria: Criterion[];
  overall_eligibility: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW_NEEDED';
  mapping_analysis: any;
  fit_score: { overall_fit: number; inclusion_fit: number; exclusion_fit: number };
  explanation: string;
  title: string;
  phase?: string;
  sponsor?: string;
  nct_id: string;
  confidence_score: number;
  semantic_score: number;
  distance_km?: number;
}

interface PatientTrialMappingProps {
  match: MatchingAnalysis;
  onClose?: () => void;
}

const PatientTrialMapping: React.FC<PatientTrialMappingProps> = ({ match, onClose }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview', 'mapping'])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getEligibilityColor = (status: string) => {
    switch (status) {
      case 'ELIGIBLE':
        return 'text-green-600';
      case 'INELIGIBLE':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getEligibilityBg = (status: string) => {
    switch (status) {
      case 'ELIGIBLE':
        return 'bg-green-50 border-green-200';
      case 'INELIGIBLE':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-yellow-50 border-yellow-200';
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className={`border rounded-lg p-4 ${getEligibilityBg(match.overall_eligibility)}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono bg-gray-200 text-gray-700 px-2 py-1 rounded">
                {match.nct_id}
              </span>
              {match.phase && (
                <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded">
                  {match.phase}
                </span>
              )}
            </div>
            <h3 className="font-semibold text-gray-800 text-base mb-1">{match.title}</h3>
            {match.sponsor && (
              <p className="text-xs text-gray-600">Sponsor: {match.sponsor}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {match.overall_eligibility === 'ELIGIBLE' && (
              <CheckCircle className="w-6 h-6 text-green-600" />
            )}
            {match.overall_eligibility === 'INELIGIBLE' && (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
            {match.overall_eligibility === 'REVIEW_NEEDED' && (
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            )}
            <span className={`font-bold text-sm ${getEligibilityColor(match.overall_eligibility)}`}>
              {match.overall_eligibility}
            </span>
            <div className="text-xs font-semibold text-gray-700">
              {Math.round(match.confidence_score * 100)}% match
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-3 p-2 bg-white bg-opacity-60 rounded text-sm text-gray-700">
          {match.explanation}
        </div>

        {/* Fit Score Visualization */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-white bg-opacity-60 rounded p-2 text-center">
            <p className="text-xs text-gray-600">Overall Fit</p>
            <p className="text-lg font-bold text-gray-800">{match.fit_score.overall_fit}%</p>
          </div>
          <div className="bg-white bg-opacity-60 rounded p-2 text-center">
            <p className="text-xs text-gray-600">Inclusions</p>
            <p className="text-lg font-bold text-green-600">{match.fit_score.inclusion_fit}%</p>
          </div>
          <div className="bg-white bg-opacity-60 rounded p-2 text-center">
            <p className="text-xs text-gray-600">Exclusions</p>
            <p className="text-lg font-bold text-blue-600">{match.fit_score.exclusion_fit}%</p>
          </div>
        </div>
      </div>

      {/* Patient Data Summary */}
      <SectionCollapsible
        title="Patient Clinical Data"
        icon={<Activity className="w-4 h-4" />}
        isExpanded={expandedSections.has('patient-data')}
        onToggle={() => toggleSection('patient-data')}
      >
        <PatientDataDisplay patient={match.patient_data} />
      </SectionCollapsible>

      {/* Trial Criteria Summary */}
      <SectionCollapsible
        title="Trial Eligibility Criteria"
        icon={<Zap className="w-4 h-4" />}
        isExpanded={expandedSections.has('trial-criteria')}
        onToggle={() => toggleSection('trial-criteria')}
      >
        <TrialCriteriaDisplay trial={match.trial_criteria} />
      </SectionCollapsible>

      {/* Detailed Mapping */}
      <SectionCollapsible
        title="Patient-Trial Mapping"
        icon={<Info className="w-4 h-4" />}
        isExpanded={expandedSections.has('mapping')}
        onToggle={() => toggleSection('mapping')}
      >
        <MappingDisplay mapping={match.mapping_analysis} />
      </SectionCollapsible>

      {/* Criteria Evaluation */}
      <SectionCollapsible
        title="Inclusion Criteria Evaluation"
        icon={<CheckCircle className="w-4 h-4 text-green-600" />}
        isExpanded={expandedSections.has('inclusions')}
        onToggle={() => toggleSection('inclusions')}
      >
        <CriteriaList criteria={match.inclusion_criteria} />
      </SectionCollapsible>

      {match.exclusion_criteria.length > 0 && (
        <SectionCollapsible
          title="Exclusion Criteria Evaluation"
          icon={<XCircle className="w-4 h-4 text-red-600" />}
          isExpanded={expandedSections.has('exclusions')}
          onToggle={() => toggleSection('exclusions')}
        >
          <CriteriaList criteria={match.exclusion_criteria} />
        </SectionCollapsible>
      )}

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
        <div>
          <p className="text-xs text-gray-600">Confidence Score</p>
          <p className="text-2xl font-bold text-blue-600">
            {Math.round(match.confidence_score * 100)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600">Semantic Score</p>
          <p className="text-2xl font-bold text-purple-600">
            {match.semantic_score.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Helper Components

interface SectionCollapsibleProps {
  title: string;
  icon?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const SectionCollapsible: React.FC<SectionCollapsibleProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-600">{icon}</span>}
        <span className="font-semibold text-gray-800">{title}</span>
      </div>
      {isExpanded ? (
        <ChevronUp className="w-5 h-5 text-gray-600" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-600" />
      )}
    </button>
    {isExpanded && <div className="p-3 space-y-2">{children}</div>}
  </div>
);

interface PatientDataDisplayProps {
  patient: PatientData;
}

const PatientDataDisplay: React.FC<PatientDataDisplayProps> = ({ patient }) => (
  <div className="space-y-3">
    <DataRow
      label="Age"
      value={patient.age ? `${patient.age} years` : 'Not recorded'}
      icon={<Users className="w-4 h-4" />}
    />
    <DataRow
      label="Gender"
      value={patient.gender || 'Not specified'}
      icon={<Users className="w-4 h-4" />}
    />

    {patient.conditions && patient.conditions.length > 0 && (
      <DataRow
        label="Conditions"
        value={patient.conditions.map((c) => c.name).join(', ')}
        icon={<Heart className="w-4 h-4" />}
      />
    )}

    {patient.medications && patient.medications.length > 0 && (
      <DataRow
        label="Medications"
        value={patient.medications.map((m) => `${m.name}${m.dosage ? ` (${m.dosage})` : ''}`).join(', ')}
        icon={<Pill className="w-4 h-4" />}
      />
    )}

    {patient.lab_values && patient.lab_values.length > 0 && (
      <div>
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
          <Microscope className="w-4 h-4" /> Lab Values
        </p>
        <div className="space-y-1">
          {patient.lab_values.map((lab, idx) => (
            <div key={idx} className="text-sm text-gray-700 ml-6">
              {lab.test_name}: <span className="font-mono">{lab.value} {lab.unit || ''}</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {patient.pregnancy_status && (
      <DataRow label="Pregnancy Status" value={patient.pregnancy_status} />
    )}

    {patient.performance_status !== undefined && (
      <DataRow
        label="Performance Status (ECOG)"
        value={patient.performance_status.toString()}
      />
    )}
  </div>
);

interface TrialCriteriaDisplayProps {
  trial: TrialCriteria;
}

const TrialCriteriaDisplay: React.FC<TrialCriteriaDisplayProps> = ({ trial }) => (
  <div className="space-y-2 text-sm text-gray-700">
    <p>
      <span className="font-semibold">Trial:</span> {trial.trial_title}
    </p>
    <p>
      <span className="font-semibold">NCT ID:</span> {trial.trial_id}
    </p>
    {trial.phase && (
      <p>
        <span className="font-semibold">Phase:</span> {trial.phase}
      </p>
    )}
    {trial.sponsor && (
      <p>
        <span className="font-semibold">Sponsor:</span> {trial.sponsor}
      </p>
    )}
  </div>
);

interface MappingDisplayProps {
  mapping: any;
}

const MappingDisplay: React.FC<MappingDisplayProps> = ({ mapping }) => (
  <div className="space-y-3">
    {mapping.age_mapping && Object.keys(mapping.age_mapping).length > 0 && (
      <MappingItem label="Age Mapping" data={mapping.age_mapping} />
    )}
    {mapping.gender_mapping && Object.keys(mapping.gender_mapping).length > 0 && (
      <MappingItem label="Gender Mapping" data={mapping.gender_mapping} />
    )}
    {mapping.condition_mapping && mapping.condition_mapping.length > 0 && (
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">Condition Mapping</p>
        <div className="space-y-2">
          {mapping.condition_mapping.map((item: any, idx: number) => (
            <MappingItem key={idx} label={item.criterion} data={item} />
          ))}
        </div>
      </div>
    )}
    {mapping.medication_mapping && mapping.medication_mapping.length > 0 && (
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">Medication Mapping</p>
        <div className="space-y-2">
          {mapping.medication_mapping.map((item: any, idx: number) => (
            <MappingItem key={idx} label={item.criterion} data={item} />
          ))}
        </div>
      </div>
    )}
    {mapping.lab_mapping && mapping.lab_mapping.length > 0 && (
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">Lab Value Mapping</p>
        <div className="space-y-2">
          {mapping.lab_mapping.map((item: any, idx: number) => (
            <MappingItem key={idx} label={item.criterion} data={item} />
          ))}
        </div>
      </div>
    )}
  </div>
);

interface MappingItemProps {
  label: string;
  data: any;
}

const MappingItem: React.FC<MappingItemProps> = ({ label, data }) => (
  <div className="bg-white rounded p-2 border border-gray-200 text-sm">
    <p className="font-semibold text-gray-800">{label}</p>
    {data.explanation && (
      <p className="text-gray-700 mt-1">{data.explanation}</p>
    )}
    {data.status && (
      <div className="flex items-center gap-2 mt-1">
        {data.status === 'MET' || data.status === 'NOT_EXCLUDED' ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          <XCircle className="w-4 h-4 text-red-600" />
        )}
        <span className="text-gray-700">{data.status}</span>
      </div>
    )}
  </div>
);

interface CriteriaListProps {
  criteria: Criterion[];
}

const CriteriaList: React.FC<CriteriaListProps> = ({ criteria }) => (
  <div className="space-y-2">
    {criteria.map((criterion, idx) => (
      <div
        key={idx}
        className={`flex items-start gap-3 p-2 rounded border ${
          criterion.status === 'MET' || criterion.status === 'NOT_EXCLUDED'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        {criterion.status === 'MET' || criterion.status === 'NOT_EXCLUDED' ? (
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0 text-sm">
          <p className="font-semibold text-gray-800">{criterion.criterion}</p>
          {criterion.patient_value !== undefined && criterion.patient_value !== null && (
            <p className="text-xs text-gray-600">
              Your value: <span className="font-mono font-semibold">{criterion.patient_value}</span>
            </p>
          )}
          {criterion.patient_has !== undefined && (
            <p className="text-xs text-gray-600">
              Your status: <span className="font-semibold">{criterion.patient_has ? 'Yes' : 'No'}</span>
            </p>
          )}
        </div>
      </div>
    ))}
  </div>
);

interface DataRowProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

const DataRow: React.FC<DataRowProps> = ({ label, value, icon }) => (
  <div className="flex items-start gap-2 text-sm">
    {icon && <span className="text-gray-600 flex-shrink-0 mt-0.5">{icon}</span>}
    <div className="flex-1">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-gray-800">{value}</p>
    </div>
  </div>
);

export default PatientTrialMapping;
