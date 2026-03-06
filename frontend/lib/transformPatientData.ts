/**
 * Transform flat CSV data to the nested patient structure expected by backend
 */

export interface TransformedPatient {
  display_id: string;
  demographics: {
    age?: number;
    gender?: string;
    location?: {
      city?: string;
      state?: string;
      country?: string;
    };
  };
  conditions: Array<{
    name: string;
    icd10?: string;
  }>;
  medications: Array<{
    name: string;
    dosage?: string;
    status?: string;
  }>;
  lab_values: Array<{
    name: string;
    value: number | string;
    unit?: string;
    date?: string;
  }>;
  clinical_notes_text?: string;
  patient_email?: string;
}

/**
 * Transform flat CSV row into nested patient structure
 * Intelligently maps CSV columns to expected backend structure
 */
export function transformPatientData(
  headers: string[],
  row: string[]
): TransformedPatient {
  const data: Record<string, string> = {};

  // Create key-value mapping from headers and row
  headers.forEach((header, idx) => {
    data[header.toLowerCase()] = row[idx] || "";
  });

  // Initialize patient object
  const patient: TransformedPatient = {
    display_id: data["patient_id"] || data["id"] || `PAT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    demographics: {
      age: data["age"] ? parseInt(data["age"]) : undefined,
      gender: data["gender"] || data["sex"],
      location: {
        city: data["city"],
        state: data["state"],
        country: data["country"],
      },
    },
    conditions: [],
    medications: [],
    lab_values: [],
    clinical_notes_text: data["clinical_notes"] || data["notes"],
    patient_email: data["email"],
  };

  // Extract conditions
  // Support multiple formats: "disease", "condition", "diagnosis", "conditions"
  const conditionField =
    data["disease"] ||
    data["condition"] ||
    data["diagnosis"] ||
    data["conditions"];

  if (conditionField) {
    // Split by semicolon or comma if multiple conditions
    const conditions = conditionField
      .split(/[;,]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    patient.conditions = conditions.map((name) => ({
      name,
      icd10: undefined, // Not available from CSV
    }));
  }

  // Extract medications
  // Support formats: "medications", "drugs", "medicines"
  const medicationField =
    data["medications"] ||
    data["drugs"] ||
    data["medicines"] ||
    data["medication"];

  if (medicationField) {
    // Split by semicolon or comma
    const meds = medicationField
      .split(/[;,]/)
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    patient.medications = meds.map((name) => ({
      name,
      dosage: undefined,
      status: "active",
    }));
  }

  // Extract lab values - look for known lab field names
  const labFields = [
    { key: "hba1c", name: "HbA1c", unit: "%" },
    { key: "glucose", name: "Glucose", unit: "mg/dL" },
    { key: "cholesterol", name: "Cholesterol", unit: "mg/dL" },
    { key: "blood_pressure", name: "Blood Pressure", unit: "mmHg" },
    { key: "egfr", name: "eGFR", unit: "mL/min" },
    { key: "creatinine", name: "Creatinine", unit: "mg/dL" },
    { key: "hemoglobin", name: "Hemoglobin", unit: "g/dL" },
    { key: "wbc", name: "WBC", unit: "K/uL" },
  ];

  labFields.forEach(({ key, name, unit }) => {
    const value = data[key];
    if (value && value !== "") {
      patient.lab_values.push({
        name,
        value: isNaN(parseFloat(value)) ? value : parseFloat(value),
        unit,
        date: new Date().toISOString().split("T")[0],
      });
    }
  });

  return patient;
}

/**
 * Batch transform multiple rows
 */
export function transformPatientBatch(
  headers: string[],
  rows: string[][]
): TransformedPatient[] {
  return rows.map((row) => transformPatientData(headers, row));
}
