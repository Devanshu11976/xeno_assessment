import time
import logging
import asyncio
from redis import Redis
from rq import Queue, Worker, Retry
from app.config.settings import settings

logger = logging.getLogger("xeno.worker")

# Retry up to 3 times with exponential back-off: 60s, 120s, 240s
RETRY_POLICY = Retry(max=3, interval=[60, 120, 240])


def process_dataset_task(job_id: str, file_path: str, country_code: str) -> None:
    """RQ entry point — orchestrates validation, DB updates, and AI report."""
    logger.info(f"Starting processing for job {job_id}")
    try:
        asyncio.run(_process_async(job_id, file_path, country_code))
        logger.info(f"Finished processing job {job_id}")
    except Exception as exc:
        logger.exception(f"Job {job_id} failed: {exc}")
        try:
            asyncio.run(_mark_failed(job_id, str(exc)))
        except Exception:
            logger.exception(f"Could not mark job {job_id} as failed in DB")
        # Re-raise so RQ can apply the retry policy
        raise


async def _process_async(job_id: str, file_path: str, country_code: str) -> None:
    from app.config.db import session_scope
    from app.repositories.jobs import JobsRepository
    from app.services.validation import validation_service
    from app.services.ai import ai_service
    from app.models.ai import AIReports

    # ── Step 1: Mark processing ───────────────────────────────────────────
    async with session_scope() as session:
        repo = JobsRepository(session)
        job = await repo.get_by_id(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found in database")
        job.status = "processing"
        await session.flush()

    # ── Step 2: Run validation (timed) ───────────────────────────────────
    t_start = time.monotonic()
    result = await validation_service.process_dataset(job_id, file_path, country_code)
    t_end = time.monotonic()
    processing_time_ms = int((t_end - t_start) * 1000)

    # ── Step 3: Persist metrics ───────────────────────────────────────────
    async with session_scope() as session:
        repo = JobsRepository(session)
        job = await repo.get_by_id(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found after validation")
        job.total_records        = result.get("total_records", 0)
        job.valid_records        = result.get("valid_records", 0)
        job.invalid_records      = result.get("invalid_records", 0)
        job.clean_file_path      = result.get("clean_file_path")
        job.error_report_path    = result.get("error_report_path")
        job.validation_breakdown = result.get("validation_breakdown")
        job.processing_time_ms   = processing_time_ms
        await session.flush()

    # ── Step 4: AI report ────────────────────────────────────────────────
    ai_report_data = await ai_service.generate_quality_report(
        {
            "job_id": job_id,
            "country_code": country_code,
            "total_records": result.get("total_records", 0),
            "valid_records": result.get("valid_records", 0),
            "invalid_records": result.get("invalid_records", 0),
            "country_stats": result.get("country_stats", {}),
            "validation_breakdown": result.get("validation_breakdown", {}),
        },
        result.get("error_logs", []),
    )

    # ── Step 5: Save AI report ────────────────────────────────────────────
    async with session_scope() as session:
        repo = JobsRepository(session)
        report = AIReports(
            job_id=job_id,
            quality_score=ai_report_data.get("quality_score", 0.0),
            common_errors=ai_report_data.get("common_errors", []),
            country_analysis=ai_report_data.get("country_analysis", {}),
            recommendations=ai_report_data.get("recommendations", []),
            executive_summary=ai_report_data.get("executive_summary", ""),
        )
        await repo.save_ai_report(report)

    # ── Step 6: Mark completed ────────────────────────────────────────────
    async with session_scope() as session:
        repo = JobsRepository(session)
        job = await repo.get_by_id(job_id)
        if job:
            job.status = "completed"
            await session.flush()


async def _mark_failed(job_id: str, error_msg: str) -> None:
    from app.config.db import session_scope
    from app.repositories.jobs import JobsRepository
    async with session_scope() as session:
        repo = JobsRepository(session)
        job = await repo.get_by_id(job_id)
        if job:
            job.status = "failed"
            await session.flush()


if __name__ == "__main__":
    redis_conn = Redis.from_url(settings.REDIS_URL)
    worker = Worker([Queue("default", connection=redis_conn)], connection=redis_conn)
    worker.work(with_scheduler=True)
