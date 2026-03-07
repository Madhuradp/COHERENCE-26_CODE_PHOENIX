'use client';

import { useState, useCallback } from 'react';

interface MatchResult {
  success: boolean;
  patient: string;
  patient_age?: number;
  patient_gender?: string;
  state_filter?: string;
  total_matches?: number;
  matches: any[];
}

interface UseTrialMatchingReturn {
  matches: any[];
  loading: boolean;
  error: string | null;
  patientAge?: number;
  patientGender?: string;
  stateFilter?: string;
  totalMatches?: number;
  runMatching: (patientId: string, state?: string) => Promise<void>;
  clearMatches: () => void;
}

/**
 * Hook for managing clinical trial matching
 * Fetches patient data and runs the matching pipeline
 */
export const useTrialMatching = (): UseTrialMatchingReturn => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patientAge, setPatientAge] = useState<number | undefined>();
  const [patientGender, setPatientGender] = useState<string | undefined>();
  const [stateFilter, setStateFilter] = useState<string | undefined>();
  const [totalMatches, setTotalMatches] = useState<number | undefined>();

  const runMatching = useCallback(
    async (patientId: string, state: string = 'Maharashtra') => {
      setLoading(true);
      setError(null);
      setMatches([]);

      try {
        // Call the backend API
        const response = await fetch(
          `/api/match/run/${patientId}?state=${encodeURIComponent(state)}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const data: MatchResult = await response.json();

        if (data.success) {
          setMatches(data.matches || []);
          setPatientAge(data.patient_age);
          setPatientGender(data.patient_gender);
          setStateFilter(data.state_filter);
          setTotalMatches(data.total_matches);
        } else {
          throw new Error('Matching operation failed');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Trial matching error:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearMatches = useCallback(() => {
    setMatches([]);
    setError(null);
    setPatientAge(undefined);
    setPatientGender(undefined);
    setStateFilter(undefined);
    setTotalMatches(undefined);
  }, []);

  return {
    matches,
    loading,
    error,
    patientAge,
    patientGender,
    stateFilter,
    totalMatches,
    runMatching,
    clearMatches,
  };
};
