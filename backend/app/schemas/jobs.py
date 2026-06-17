import uuid
from typing import Optional
import msgspec


class UploadResponse(msgspec.Struct):
    job_id: str
    status: str


class JobStatusResponse(msgspec.Struct):
    job_id: str
    status: str


class CountryStatEntry(msgspec.Struct):
    """Per-country record breakdown."""
    total: int
    valid: int
    invalid: int


class ChunkInfo(msgspec.Struct):
    """Metadata for a single output chunk."""
    url: str
    record_count: int
    file_size_bytes: int


class JobDetailsResponse(msgspec.Struct):
    job_id: str
    uploaded_file_id: uuid.UUID
    status: str
    total_records: Optional[int]
    valid_records: Optional[int]
    invalid_records: Optional[int]
    clean_file_path: Optional[str]
    error_report_path: Optional[str]
    processing_time_ms: Optional[int]
    # Per-country breakdown from validation_breakdown["country_stats"]
    country_stats: dict[str, CountryStatEntry]
    # Error type distribution from validation_breakdown
    validation_breakdown: dict[str, int]


class DownloadLinksResponse(msgspec.Struct):
    job_id: str
    clean_transactions_url: Optional[str]
    clean_record_count: Optional[int]
    clean_file_size_bytes: Optional[int]
    error_report_url: Optional[str]
    error_record_count: Optional[int]
    error_file_size_bytes: Optional[int]
    chunks: list[ChunkInfo]


class AIReportResponse(msgspec.Struct):
    quality_score: float
    common_errors: list[dict]
    country_analysis: dict
    recommendations: list[str]
    executive_summary: str


class JobListItem(msgspec.Struct):
    job_id: str
    status: str
    total_records: Optional[int]
    valid_records: Optional[int]
    invalid_records: Optional[int]
