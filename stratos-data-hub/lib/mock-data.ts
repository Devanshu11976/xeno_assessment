// ─── Demo mode data ───────────────────────────────────────────────────────────
// Loaded when the workspace is opened with ?demo=true.
// Mirrors the exact shape of JobDetails, AIReport, and Downloads from the
// workspace page so the same UI components render without modification.

export const DEMO_JOB = {
  job_id: 'DEMO-STRATOS-2024',
  status: 'completed' as const,
  total_records: 14_872,
  valid_records: 13_104,
  invalid_records: 1_768,
  processing_time_ms: 1_243,
  country_stats: {
    IN: { total: 5_420, valid: 4_987, invalid: 433 },
    SG: { total: 3_210, valid: 2_941, invalid: 269 },
    US: { total: 2_890, valid: 2_674, invalid: 216 },
    DE: { total: 1_804, valid: 1_421, invalid: 383 },
    GB: { total: 1_548, valid: 1_081, invalid: 467 },
  },
  validation_breakdown: {
    phone_format: 712,
    date_ambiguous: 398,
    payment_field_drift: 287,
    duplicate_order_id: 201,
    currency_mismatch: 108,
    missing_required: 62,
  },
}

export const DEMO_REPORT = {
  quality_score: 88.1,
  executive_summary:
    'This batch of 14,872 transactions achieves an 88.1% quality score. ' +
    'The dominant issue is phone number formatting inconsistency from the DE and GB ' +
    'regions, where a checkout form regression introduced malformed prefixes after 18:00 UTC ' +
    'on the collection date. Payment field drift is concentrated in the SG gateway, ' +
    'where currency codes are being exported as numeric ISO 4217 codes instead of ' +
    'alphabetic strings. Date ambiguity (DD/MM vs MM/DD) accounts for a further 398 rows ' +
    'and is isolated to records from US-based resellers. Recommend targeted fixes to the ' +
    'three root causes before re-processing; all other records are clean and reconciliation-ready.',
  common_errors: [
    { field: 'phone_number',  error: 'Invalid format for country DE/GB',   count: 712 },
    { field: 'payment_date',  error: 'Ambiguous date format MM/DD vs DD/MM', count: 398 },
    { field: 'currency_code', error: 'Numeric ISO 4217 instead of alpha-3',  count: 287 },
    { field: 'order_id',      error: 'Duplicate within batch window',        count: 201 },
    { field: 'amount',        error: 'Currency symbol embedded in value',    count: 108 },
    { field: 'customer_id',   error: 'Required field missing',               count:  62 },
  ],
  country_analysis: {
    IN: { status: 'passing', issue: null },
    SG: { status: 'warning', issue: 'Numeric currency codes in 8.4% of records' },
    US: { status: 'warning', issue: 'Date format ambiguity in reseller exports' },
    DE: { status: 'failing', issue: 'Phone prefix regression after 18:00 UTC' },
    GB: { status: 'failing', issue: 'Phone format non-E.164 in 30% of records' },
  },
  recommendations: [
    'Fix the DE/GB checkout form to output E.164-formatted phone numbers; re-export only the affected records (approx. 850 rows).',
    'Update the SG payment gateway configuration to emit ISO 4217 alphabetic currency codes (SGD, USD) rather than numeric equivalents.',
    'Enforce ISO 8601 (YYYY-MM-DD) date output for all US reseller integrations to eliminate DD/MM vs MM/DD ambiguity.',
    'Deduplicate order IDs using the provided error report before loading into the reconciliation system.',
    'Add a required-field validation gate at ingestion to catch missing customer_id upstream.',
  ],
}

export const DEMO_DOWNLOADS = {
  clean_transactions_url: null,   // demo — no real file
  clean_record_count: 13_104,
  clean_file_size_bytes: 2_847_392,
  error_report_url: null,         // demo — no real file
  error_record_count: 1_768,
  error_file_size_bytes: 384_110,
  chunks: [
    { url: null as unknown as string, record_count: 5_000, file_size_bytes: 1_089_200 },
    { url: null as unknown as string, record_count: 5_000, file_size_bytes: 1_091_440 },
    { url: null as unknown as string, record_count: 3_104, file_size_bytes: 666_752 },
  ],
}
