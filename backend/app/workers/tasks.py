import logging
import asyncio
from redis import Redis
from rq import Queue, Worker
from app.config.settings import settings

logger = logging.getLogger("xeno.worker")


def process_dataset_task(job_id: str, file_path: str, country_code: str) -> None:
    """Asynchronous worker entry point.

    Triggered by Redis RQ. Orchestrates data validation, DB updates,
    outputs creation, and AI analysis.
    """
    logger.info(f"Starting processing for job {job_id}")
    try:
        asyncio.run(_process_async(job_id, file_path, country_code))
        logger.info(f"Finished processing job {job_id}")
    except Exception as exc:
        logger.exception(f"Job {job_id} failed: {exc}")
        # Mark as failed in the database
        try:
            asyncio.run(_mark_failed(job_id, str(exc)))
        except Exception:
            logger.exception(f"Could not mark job {job_id} as failed in DB")


async def _process_async(job_id: str, file_path: str, country_code: str) -> None:
    """The actual async processing pipeline."""
    from app.config.db import session_scope
    from app.repositories.jobs import JobsRepository
    from app.services.validation import validation_service
    from app.services.ai import ai_service
    from app.models.ai import AIReports

    # Step 1: Mark status = processing
    async with session_scope() as session:
        repo = JobsRepository(session)
        job = await repo.get_by_id(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found in database")
        job.status = "processing"
        await session.flush()

    # Step 2: Run validation pipeline
    result = await validation_service.process_dataset(job_id, file_path, country_code)

    # Step 3: Update DB with validation results
    async with session_scope() as session:
        repo = JobsRepository(session)
        job = await repo.get_by_id(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found after validation")
        job.total_records = result.get("total_records", 0)
        job.valid_records = result.get("valid_records", 0)
        job.invalid_records = result.get("invalid_records", 0)
        job.clean_file_path = result.get("clean_file_path")
        job.error_report_path = result.get("error_report_path")
        job.validation_breakdown = result.get("validation_breakdown")
        await session.flush()

    # Step 4: Generate AI report
    error_logs = result.get("error_logs", [])
    job_metrics = {
        "job_id": job_id,
        "country_code": country_code,
        "total_records": result.get("total_records", 0),
        "valid_records": result.get("valid_records", 0),
        "invalid_records": result.get("invalid_records", 0),
    }
    ai_report_data = await ai_service.generate_quality_report(job_metrics, error_logs)

    # Step 5: Save AI report to database
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

    # Step 6: Mark status = completed
    async with session_scope() as session:
        repo = JobsRepository(session)
        job = await repo.get_by_id(job_id)
        if job:
            job.status = "completed"
            await session.flush()


async def _mark_failed(job_id: str, error_msg: str) -> None:
    """Mark a job as failed in the database."""
    from app.config.db import session_scope
    from app.repositories.jobs import JobsRepository

    async with session_scope() as session:
        repo = JobsRepository(session)
        job = await repo.get_by_id(job_id)
        if job:
            job.status = "failed"
            await session.flush()


# Hook for launching the worker process container
if __name__ == "__main__":
    redis_conn = Redis.from_url(settings.REDIS_URL)
    # Poll 'default' queue for incoming files validation jobs
    queue_name = "default"

    logger.info(f"Initializing RQ Worker on queue: {queue_name}")
    worker = Worker([Queue(queue_name, connection=redis_conn)], connection=redis_conn)
    worker.work(with_scheduler=True)
