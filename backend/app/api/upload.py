import os
import uuid
from pathlib import Path
from typing import Annotated, Any
from litestar import Controller, post, get
from litestar.enums import RequestEncodingType
from litestar.params import Body
from litestar.datastructures import UploadFile
from litestar.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from redis import Redis
from rq import Queue

from app.schemas.jobs import (
    UploadResponse,
    JobStatusResponse,
    JobDetailsResponse,
    JobListItem,
    DownloadLinksResponse,
    AIReportResponse,
)
from app.models.jobs import UploadedFiles, ProcessingJobs
from app.repositories.jobs import JobsRepository
from app.config.settings import settings


class UploadController(Controller):
    path = "/api"

    # ------------------------------------------------------------------ #
    #  POST /api/upload                                                    #
    # ------------------------------------------------------------------ #
    @post(path="/upload", media_type="application/json")
    async def upload_file(
        self,
        data: Annotated[dict[str, Any], Body(media_type=RequestEncodingType.MULTI_PART)],
        session: AsyncSession,
    ) -> UploadResponse:
        """Accept a CSV or XLSX file, persist it, and enqueue a worker job."""
        file_item = data.get("file")
        country_code = data.get("country_code")

        if not file_item or not isinstance(file_item, UploadFile):
            raise HTTPException(status_code=400, detail="No file uploaded")

        if not country_code:
            raise HTTPException(status_code=400, detail="No country_code specified")

        if isinstance(country_code, bytes):
            country_code = country_code.decode("utf-8")

        filename = file_item.filename or "upload"
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in ("csv", "xlsx"):
            raise HTTPException(status_code=400, detail="Only CSV and XLSX files are accepted")

        content = await file_item.read()
        file_size = len(content)

        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        job_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
        safe_name = f"{job_id}_{filename}"
        file_path = os.path.join(settings.UPLOAD_DIR, safe_name)

        try:
            with open(file_path, "wb") as fh:
                fh.write(content)
        except OSError as exc:
            raise HTTPException(status_code=500, detail=f"Failed to save file: {exc}")

        try:
            repo = JobsRepository(session)

            uploaded_file = UploadedFiles(
                filename=filename,
                file_path=file_path,
                file_size=file_size,
                mime_type=file_item.content_type or "application/octet-stream",
            )
            await repo.create_file_metadata(uploaded_file)

            job = ProcessingJobs(
                id=job_id,
                uploaded_file_id=uploaded_file.id,
                status="queued",
            )
            await repo.create(job)
            await session.commit()
        except Exception as exc:
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except OSError:
                    pass
            raise HTTPException(status_code=500, detail=f"DB registration failed: {exc}")

        try:
            redis_conn = Redis.from_url(settings.REDIS_URL)
            q = Queue("default", connection=redis_conn)
            q.enqueue("app.workers.tasks.process_dataset_task", job_id, file_path, country_code)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to enqueue task: {exc}")

        return UploadResponse(job_id=job_id, status="queued")

    # ------------------------------------------------------------------ #
    #  GET /api/jobs                                                       #
    # ------------------------------------------------------------------ #
    @get(path="/jobs")
    async def list_jobs(self, session: AsyncSession) -> list[JobListItem]:
        """Return all processing jobs ordered by most recent first."""
        from sqlalchemy import select, desc
        stmt = select(ProcessingJobs).order_by(desc(ProcessingJobs.id))
        result = await session.execute(stmt)
        jobs = result.scalars().all()
        return [
            JobListItem(
                job_id=j.id,
                status=j.status,
                total_records=j.total_records,
                valid_records=j.valid_records,
                invalid_records=j.invalid_records,
            )
            for j in jobs
        ]

    # ------------------------------------------------------------------ #
    #  GET /api/jobs/{job_id}                                              #
    # ------------------------------------------------------------------ #
    @get(path="/jobs/{job_id:str}")
    async def get_job_details(self, job_id: str, session: AsyncSession) -> JobDetailsResponse:
        """Return full details for a single job."""
        repo = JobsRepository(session)
        job = await repo.get_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        return JobDetailsResponse(
            job_id=job.id,
            uploaded_file_id=job.uploaded_file_id,
            status=job.status,
            total_records=job.total_records,
            valid_records=job.valid_records,
            invalid_records=job.invalid_records,
            clean_file_path=job.clean_file_path,
            error_report_path=job.error_report_path,
        )

    # ------------------------------------------------------------------ #
    #  GET /api/jobs/{job_id}/status                                       #
    # ------------------------------------------------------------------ #
    @get(path="/jobs/{job_id:str}/status")
    async def get_job_status(self, job_id: str, session: AsyncSession) -> JobStatusResponse:
        """Lightweight heartbeat — returns only job_id and status."""
        repo = JobsRepository(session)
        job = await repo.get_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        return JobStatusResponse(job_id=job.id, status=job.status)

    # ------------------------------------------------------------------ #
    #  GET /api/jobs/{job_id}/report                                       #
    # ------------------------------------------------------------------ #
    @get(path="/jobs/{job_id:str}/report")
    async def get_job_ai_report(self, job_id: str, session: AsyncSession) -> AIReportResponse:
        """Return the AI quality report generated by Groq for this job."""
        repo = JobsRepository(session)
        report = await repo.get_ai_report(job_id)
        if not report:
            raise HTTPException(status_code=404, detail=f"No AI report found for job {job_id}")
        return AIReportResponse(
            quality_score=report.quality_score,
            common_errors=report.common_errors or [],
            country_analysis=report.country_analysis or {},
            recommendations=report.recommendations or [],
            executive_summary=report.executive_summary or "",
        )

    # ------------------------------------------------------------------ #
    #  GET /api/jobs/{job_id}/validation-breakdown                       #
    # ------------------------------------------------------------------ #
    @get(path="/jobs/{job_id:str}/validation-breakdown")
    async def get_job_validation_breakdown(self, job_id: str, session: AsyncSession) -> dict[str, int]:
        """Return the validation breakdown counts for this job."""
        repo = JobsRepository(session)
        job = await repo.get_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        if job.validation_breakdown:
            return job.validation_breakdown
            
        # Fallback to file reading if DB column is null (e.g. for compatibility)
        try:
            import json
            from app.services.storage import storage_service
            breakdown_path = storage_service.get_validation_breakdown_path(job_id)
            if breakdown_path.exists():
                with open(breakdown_path, "r") as fh:
                    return json.load(fh)
        except Exception:
            pass
            
        return {
            "invalid_phone": 0,
            "invalid_date": 0,
            "invalid_payment_mode": 0,
            "duplicate_order_id": 0,
            "negative_quantity": 0,
            "negative_amount": 0,
            "missing_fields": 0,
        }

    # ------------------------------------------------------------------ #
    #  GET /api/jobs/{job_id}/downloads                                    #
    # ------------------------------------------------------------------ #
    @get(path="/jobs/{job_id:str}/downloads")
    async def get_job_downloads(self, job_id: str, session: AsyncSession) -> DownloadLinksResponse:
        """Return download URLs for clean CSV, error report, and chunk files."""
        repo = JobsRepository(session)
        job = await repo.get_by_id(job_id)
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

        clean_url: str | None = None
        error_url: str | None = None
        chunk_urls: list[str] = []

        output_dir = Path(settings.OUTPUT_DIR) / job_id
        if output_dir.exists():
            if (output_dir / "clean_transactions.csv").exists():
                clean_url = f"/api/downloads/{job_id}/clean"
            if (output_dir / "error_report.csv").exists():
                error_url = f"/api/downloads/{job_id}/errors"
            chunk_urls = [
                f"/api/downloads/{job_id}/chunk/{p.stem.split('_')[-1]}"
                for p in sorted(output_dir.glob("chunk_*.csv"))
            ]

        return DownloadLinksResponse(
            job_id=job_id,
            clean_transactions_url=clean_url,
            error_report_url=error_url,
            chunks_urls=chunk_urls,
        )
