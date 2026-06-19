# Download Buttons Fix Summary

## Problem
Download buttons ("Download Clean Data", "Download Error Log", "Download Chunks") were missing from the Validation Workspace results page after job completion.

## Root Cause
The backend `get_job_downloads` endpoint was not returning record counts (`clean_record_count`, `error_record_count`) for files stored in Supabase Storage. The frontend `DownloadCenter` component only shows download buttons if at least one record count or chunks exist:

```typescript
const hasAny = downloads.clean_record_count || downloads.error_record_count || downloads.chunks.length > 0
if (!hasAny) return null
```

For local filesystem paths, the backend correctly set record counts using `_safe_record_count()`. However, for Supabase storage paths, it only set the signed URL but not the record count or file size, causing the frontend condition to fail and hiding the download buttons.

## Files Modified

### 1. `backend/app/api/upload.py`
**Lines 358-370 (Clean file - Supabase path):**
```python
else:
    # Supabase storage path
    try:
        clean_url = storage_service.generate_signed_url(job.clean_file_path, expires_in=3600)
        # Try to get file size from Supabase metadata
        try:
            clean_sz = storage_service.get_file_size(job.clean_file_path)
        except Exception:
            clean_sz = None
        # Record count not available from Supabase without downloading, use job.valid_records
        clean_rc = job.valid_records
        logger.info(f"Job {job_id}: Clean file from Supabase: {job.clean_file_path}, url={clean_url}, size={clean_sz}")
    except Exception as e:
        logger.error(f"Job {job_id}: Failed to generate signed URL for clean file: {e}")
```

**Lines 387-400 (Error file - Supabase path):**
```python
else:
    # Supabase storage path
    try:
        error_url = storage_service.generate_signed_url(job.error_report_path, expires_in=3600)
        # Try to get file size from Supabase metadata
        try:
            error_sz = storage_service.get_file_size(job.error_report_path)
        except Exception:
            error_sz = None
        # Record count not available from Supabase without downloading, use job.invalid_records
        error_rc = job.invalid_records
        logger.info(f"Job {job_id}: Error file from Supabase: {job.error_report_path}, url={error_url}, size={error_sz}")
    except Exception as e:
        logger.error(f"Job {job_id}: Failed to generate signed URL for error file: {e}")
```

### 2. `backend/app/services/storage.py`
**Lines 218-242 (New method):**
```python
def get_file_size(self, storage_path: str) -> Optional[int]:
    """
    Get file size from Supabase Storage metadata.
    
    Args:
        storage_path: Path in Supabase Storage
        
    Returns:
        File size in bytes, or None if unavailable
    """
    if not self.supabase:
        return None
    
    try:
        # Get file metadata from Supabase
        response = self.supabase.storage.from_(settings.supabase_bucket_name).get_metadata(
            [storage_path]
        )
        if response and len(response) > 0:
            # Supabase returns metadata with size in bytes
            return response[0].get("metadata", {}).get("size") or response[0].get("size")
    except Exception as e:
        logger.warning(f"Failed to get file size for {storage_path}: {e}")
    
    return None
```

## Fix Applied
1. **Added `get_file_size` method** to `StorageService` to retrieve file size from Supabase Storage metadata
2. **Updated `get_job_downloads` endpoint** to set record counts and file sizes for Supabase storage paths:
   - For clean files: Use `job.valid_records` for record count (since we can't get it from Supabase without downloading)
   - For error files: Use `job.invalid_records` for record count
   - Try to get file size from Supabase metadata using the new `get_file_size` method

## Verification Required
Run a test job to COMPLETED status and confirm:
1. Download buttons appear for Clean Data and Error Report
2. Buttons successfully download the correct files
3. Clean data contains only valid records
4. Error report contains only invalid records with validation_errors populated

## Chunk Generation Status
Chunks are not yet implemented for Supabase storage (line 406 in upload.py). The "0 chunks generated" metric is expected behavior for current dataset sizes (100-500 records). Chunk generation logic needs to be implemented separately if required for larger datasets.

## Frontend Component
The frontend `DownloadCenter` component in `xeno-data-hub/app/workspace/page.tsx` (lines 380-412) is correctly implemented and does not require changes. The issue was purely on the backend side not returning the required data fields.
