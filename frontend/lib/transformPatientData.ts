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
  // Support multiple formats: "disease", "condition", "diagnosis", "conditions", "primary_condition", etc.
  let conditionField = "";
  const conditionKeys = [
    "disease",
    "condition",
    "diagnosis",
    "conditions",
    "primary_condition",
    "primary_diagnosis",
    "medical_condition",
  ];

  for (const key of conditionKeys) {
    if (data[key] && data[key].trim()) {
      conditionField = data[key];
      break;
    }
  }

  if (conditionField && conditionField.trim()) {
    // Split by semicolon, comma, pipe, or slash
    const conditions = conditionField
      .split(/[;,|/]/)
      .map((c) => c.trim())
      .filter((c) => c.length > 2); // Ignore very short strings (likely errors)

    patient.conditions = conditions.map((name) => ({
      name: capitalizeWords(name),
      icd10: undefined, // Not available from CSV
    }));
  }

  // Extract medications
  // Support formats: "medications", "drugs", "medicines", "meds", "treatment", etc.
  let medicationField = "";
  const medicationKeys = [
    "medications",
    "medication",
    "drugs",
    "drug",
    "medicines",
    "medicine",
    "meds",
    "med",
    "treatment",
    "treatments",
    "current_medications",
  ];

  for (const key of medicationKeys) {
    if (data[key] && data[key].trim()) {
      medicationField = data[key];
      break;
    }
  }

  if (medicationField && medicationField.trim()) {
    // Split by semicolon, comma, pipe, or slash
    const meds = medicationField
      .split(/[;,|/]/)
      .map((m) => m.trim())
      .filter((m) => m.length > 1); // Ignore single characters

    patient.medications = meds.map((name) => ({
      name: capitalizeWords(name),
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
 * Capitalize first letter of each word
 */
function capitalizeWords(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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
