# Render Worker Deployment Fix

## Problem
The Render worker deployment was failing with:
```
Port scan timeout reached, no open ports detected. Bind your service to at least one port. If you don't need to receive traffic on any port, create a background worker instead.
```

## Root Cause
The Dockerfile was running database migrations and attempting to start the API server (`python main.py`) even when used as a worker service. While the `render.yaml` specified `dockerCommand` to override this, the migrations were still running, and the worker process doesn't expose HTTP ports, causing Render's health check to fail.

## Solution

### 1. Modified `backend/Dockerfile`
**Changed the CMD to conditionally run either worker or API:**
```dockerfile
# Old CMD:
CMD sh -c "alembic upgrade head && python main.py"

# New CMD:
CMD sh -c "if [ \"$RQ_WORKER\" = \"true\" ]; then python start_worker.py; else alembic upgrade head && python main.py; fi"
```

This checks for the `RQ_WORKER` environment variable:
- If `RQ_WORKER=true`: Runs the worker process (no HTTP ports, no migrations)
- If not set: Runs the API server with migrations (normal web service)

### 2. Modified `render.yaml`
**Added `RQ_WORKER=true` environment variable to worker service:**
```yaml
- type: worker
  name: xeno-worker
  runtime: docker
  dockerfilePath: ./backend/Dockerfile
  dockerContext: ./backend
  plan: free
  envVars:
    - key: RQ_WORKER
      value: true  # This tells Dockerfile to run worker instead of API
    - key: ENV
      value: production
    # ... other env vars
```

**Removed `dockerCommand` override:**
- The old approach used `dockerCommand: python -m rq.cli worker --url $REDIS_URL default`
- The new approach uses the environment variable + conditional CMD for cleaner separation

**Added missing `SECRET_KEY` to worker service:**
- The worker needs `SECRET_KEY` for proper application functionality
- Added `generateValue: true` to auto-generate it

## How It Works

### API Service (xeno-api)
- No `RQ_WORKER` environment variable
- Dockerfile runs: `alembic upgrade head && python main.py`
- Exposes port 8000 for HTTP traffic
- Health check at `/api/docs` works correctly

### Worker Service (xeno-worker)
- Has `RQ_WORKER=true` environment variable
- Dockerfile runs: `python start_worker.py`
- No HTTP ports exposed (background process only)
- No port scanning needed by Render
- Processes jobs from Redis queue

## Benefits

1. **Single Dockerfile**: One Dockerfile now supports both API and worker deployments
2. **Clean Separation**: Environment variable clearly indicates deployment type
3. **No Port Conflicts**: Worker doesn't try to bind to ports or run migrations
4. **Render Native**: Uses Render's built-in worker service type correctly
5. **Simplified Debugging**: Clear logs showing which mode is running

## Verification

After deploying these changes:

1. **API Service**: Should start successfully with migrations and expose port 8000
2. **Worker Service**: Should start successfully without port scanning, logs should show:
   ```
   Starting RQ worker for queue: default
   Redis URL: redis://...
   *** Listening on default...
   ```
3. **No Health Check Failures**: Worker deployment should succeed without timeout

## Files Modified

1. `backend/Dockerfile` - Added conditional CMD logic
2. `render.yaml` - Added RQ_WORKER env var, removed dockerCommand, added SECRET_KEY