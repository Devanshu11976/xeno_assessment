import os
from pathlib import Path
from app.config.settings import settings

class StorageService:
    """Manages physical files paths and guarantees folders exist on disk."""
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.output_dir = Path(settings.OUTPUT_DIR)
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        """Helper checking and building folders structures."""
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def get_upload_path(self, filename: str) -> Path:
        """Resolve save path for raw file uploads."""
        return self.upload_dir / filename

    def get_job_output_dir(self, job_id: str) -> Path:
        """Resolve specific output directory matching the tracking job_id."""
        job_dir = self.output_dir / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        return job_dir

    def get_clean_output_path(self, job_id: str) -> Path:
        """Clean CSV save path."""
        return self.get_job_output_dir(job_id) / "clean_transactions.csv"

    def get_error_report_path(self, job_id: str) -> Path:
        """Error failure CSV report path."""
        return self.get_job_output_dir(job_id) / "error_report.csv"

    def get_chunk_output_path(self, job_id: str, chunk_index: int) -> Path:
        """Batch sub-split chunk CSV file path."""
        return self.get_job_output_dir(job_id) / f"chunk_{chunk_index}.csv"

    def get_validation_breakdown_path(self, job_id: str) -> Path:
        """Validation breakdown JSON file path."""
        return self.get_job_output_dir(job_id) / "validation_breakdown.json"

storage_service = StorageService()
