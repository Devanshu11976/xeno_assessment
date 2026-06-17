from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, Integer, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.database import Base

if TYPE_CHECKING:
    from app.models.logs import ValidationLogs
    from app.models.ai import AIReports


class UploadedFiles(Base):
    __tablename__ = "uploaded_files"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        primary_key=True, 
        default=uuid.uuid4
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)

    # Relationships
    job: Mapped[Optional[ProcessingJobs]] = relationship(
        "ProcessingJobs", 
        back_populates="uploaded_file", 
        cascade="all, delete-orphan"
    )

class ProcessingJobs(Base):
    __tablename__ = "processing_jobs"

    id: Mapped[str] = mapped_column(
        String(50), 
        primary_key=True, 
        comment="Unique tracking identifier e.g. TXN-12345"
    )
    uploaded_file_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("uploaded_files.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), 
        default="queued", 
        index=True,
        comment="queued | processing | completed | failed"
    )
    total_records: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    valid_records: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    invalid_records: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    clean_file_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    error_report_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    validation_breakdown: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # Relationships
    uploaded_file: Mapped[UploadedFiles] = relationship(
        "UploadedFiles", 
        back_populates="job"
    )
    validation_logs: Mapped[list[ValidationLogs]] = relationship(
        "ValidationLogs", 
        back_populates="job", 
        cascade="all, delete-orphan"
    )
    ai_report: Mapped[Optional[AIReports]] = relationship(
        "AIReports", 
        back_populates="job", 
        cascade="all, delete-orphan"
    )
