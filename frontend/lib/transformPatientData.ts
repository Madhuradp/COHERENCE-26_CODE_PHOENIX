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
 * Normalize column header for matching
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/[_\-\s]+/g, "_")
    .replace(/s$/, ""); // Remove trailing 's' for plural normalization
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
  const headerMap: Record<string, string> = {}; // Map normalized headers to original values

  // Create key-value mapping from headers and row with multiple normalization strategies
  headers.forEach((header, idx) => {
    const value = row[idx] || "";
    const lowerHeader = header.toLowerCase();
    const normalizedHeader = normalizeHeader(header);

    // Store multiple variations for lookup
    data[lowerHeader] = value;
    data[normalizedHeader] = value;
    headerMap[normalizedHeader] = header;
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

  // Extract conditions - support MANY variations of column names
  let conditionField = "";
  const conditionVariations = [
    // Singular forms
    "condition",
    "diagnosis",
    "disease",
    "disorder",
    "illness",
    "medical_condition",
    "chief_complaint",
    // Plural forms
    "conditions",
    "diagnoses",
    "diseases",
    "disorders",
    "illnesses",
    "medical_conditions",
    // Primary/main
    "primary_condition",
    "primary_diagnosis",
    "primary_disease",
    "main_condition",
    "chief_diagnosis",
    // Additional
    "additional_condition",
    "additional_diagnosis",
    "comorbidity",
    "comorbidities",
    "clinical_diagnosis",
    "patient_condition",
    "health_condition",
    "medical_diagnosis",
    // Named variations
    "disease_name",
    "condition_name",
    "diagnosis_name",
    "disorder_name",
    // Abbreviated
    "diag",
    "dx",
    "cond",
    "icd",
    "disease_type",
    "condition_type",
  ];

  for (const key of conditionVariations) {
    const normalized = normalizeHeader(key);
    if (data[normalized] && data[normalized].trim()) {
      conditionField = data[normalized];
      break;
    }
  }

  if (conditionField && conditionField.trim()) {
    // Split by semicolon, comma, pipe, slash, or 'and'
    const conditions = conditionField
      .split(/[;,|/]|(\s+and\s+)/i)
      .map((c) => c.trim())
      .filter((c) => c.length > 1 && c.toLowerCase() !== "and"); // Ignore short strings and 'and'

    patient.conditions = conditions.map((name) => ({
      name: capitalizeWords(name),
      icd10: undefined, // Not available from CSV
    }));
  }

  // Extract medications - support MANY variations of column names
  let medicationField = "";
  const medicationVariations = [
    // Common names
    "medication",
    "medications",
    "drug",
    "drugs",
    "medicine",
    "medicines",
    "med",
    "meds",
    // Treatment related
    "treatment",
    "treatments",
    "pharmaceutical",
    "pharmaceuticals",
    "therapy",
    "therapies",
    // Status variations
    "current_medication",
    "current_medications",
    "current_drug",
    "current_drugs",
    "active_medication",
    "active_medications",
    // Specific types
    "prescription",
    "prescriptions",
    "rx",
    "rxs",
    "otc",
    "over_the_counter",
    // Combined terms
    "medication_name",
    "drug_name",
    "medicine_name",
    "medication_list",
    "drug_list",
    "patient_medication",
    "patient_medications",
    "current_treatment",
    "ongoing_treatment",
    // Abbreviated
    "med_list",
    "drug_list",
    "rx_list",
    "current_med",
    "active_med",
    "taking",
  ];

  for (const key of medicationVariations) {
    const normalized = normalizeHeader(key);
    if (data[normalized] && data[normalized].trim()) {
      medicationField = data[normalized];
      break;
    }
  }

  if (medicationField && medicationField.trim()) {
    // Split by semicolon, comma, pipe, slash, or 'and'
    // Also handle formats like "med1, med2 and med3"
    const meds = medicationField
      .split(/[;,|/]|(\s+and\s+)/i)
      .map((m) => m.trim())
      .filter((m) => m.length > 1 && m.toLowerCase() !== "and"); // Ignore short strings and 'and'

    patient.medications = meds.map((name) => ({
      name: capitalizeWords(name),
      dosage: undefined,
      status: "active",
    }));
  }

  // Extract lab values - look for known lab field names with multiple variations
  const labFields = [
    // HbA1c - diabetes monitoring
    { keys: ["hba1c", "hemoglobin_a1c", "ha1c", "glycated_hemoglobin"], name: "HbA1c", unit: "%" },
    // Glucose - blood sugar
    { keys: ["glucose", "blood_glucose", "fasting_glucose", "fg", "bs"], name: "Glucose", unit: "mg/dL" },
    // Cholesterol
    { keys: ["cholesterol", "total_cholesterol", "tc"], name: "Cholesterol", unit: "mg/dL" },
    // Blood Pressure
    { keys: ["blood_pressure", "bp", "systolic", "diastolic"], name: "Blood Pressure", unit: "mmHg" },
    // eGFR - kidney function
    { keys: ["egfr", "gfr", "estimated_gfr"], name: "eGFR", unit: "mL/min" },
    // Creatinine - kidney function
    { keys: ["creatinine", "serum_creatinine", "creat"], name: "Creatinine", unit: "mg/dL" },
    // Hemoglobin - red blood cells
    { keys: ["hemoglobin", "hgb", "hb"], name: "Hemoglobin", unit: "g/dL" },
    // White Blood Cell count
    { keys: ["wbc", "white_blood_cell", "white_blood_cells", "leukocyte"], name: "WBC", unit: "K/uL" },
    // Additional common labs
    { keys: ["alt", "sgpt"], name: "ALT", unit: "U/L" },
    { keys: ["ast", "sgot"], name: "AST", unit: "U/L" },
    { keys: ["ldl", "ldl_cholesterol"], name: "LDL", unit: "mg/dL" },
    { keys: ["hdl", "hdl_cholesterol"], name: "HDL", unit: "mg/dL" },
    { keys: ["triglyceride", "triglycerides", "tg"], name: "Triglycerides", unit: "mg/dL" },
    { keys: ["bun", "urea"], name: "BUN", unit: "mg/dL" },
    { keys: ["platelets", "plt"], name: "Platelets", unit: "K/uL" },
  ];

  labFields.forEach(({ keys, name, unit }) => {
    for (const key of keys) {
      const normalized = normalizeHeader(key);
      const value = data[normalized];
      if (value && value !== "" && value.toLowerCase() !== "n/a" && value.toLowerCase() !== "na") {
        patient.lab_values.push({
          name,
          value: isNaN(parseFloat(value)) ? value : parseFloat(value),
          unit,
          date: new Date().toISOString().split("T")[0],
        });
        break; // Don't add duplicates
      }
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
