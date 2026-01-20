export const COLUMN_KEYS = {
  SERIAL: 'serial',
  IS_PATIENT: 'isPatient',
  IS_CONFIRMED: 'isConfirmedCase',
  BASIC_INFO: 'basicInfo',
  CLINICAL_SYMPTOMS: 'clinicalSymptoms',
  SYMPTOM_ONSET: 'symptomOnset',
  INDIVIDUAL_EXPOSURE: 'individualExposureTime',
  DIET_INFO: 'dietInfo',
} as const;

export const HEADER_TYPES = {
  BASIC: 'basic',
  CLINICAL: 'clinical',
  DIET: 'diet',
} as const;
