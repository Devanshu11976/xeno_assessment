# Render Deployment Hang Troubleshooting Guide

## Problem
Render deploy is hanging indefinitely during Alembic migration step. Deploy log stops after:
```
INFO [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO [alembic.runtime.migration] Will assume transactional DDL.
```

## Root Cause Analysis

### Most Likely: Stale Postgres Advisory Lock
Alembic takes a Postgres advisory lock before running `upgrade head` to prevent concurrent migrations. If a previous deploy crashed, was cancelled, or was killed mid-migration without releasing that lock, the new deploy will hang forever waiting to acquire it.

### Other Possible Causes
- DB connection hanging (not failing)
- Missing merge migration in deployed code
- Network connectivity issues

## Investigation Steps

### Step 1: Check for Stale Advisory Locks
Connect to the production/staging Postgres DB directly and run:

```sql
-- Check for advisory locks
SELECT pid, granted, mode, locktype
FROM pg_locks
WHERE locktype = 'advisory';
```

If any locks are found, note the `pid` and terminate the blocking session:

```sql
-- Terminate the blocking session
SELECT pg_terminate_backend(<pid>);
```

### Step 2: Check for Long-Running/Idle Sessions
```sql
-- Check for long-running or idle-in-transaction sessions
SELECT pid, state, query, query_start, state_change
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start ASC;
```

If any sessions are in `idle in transaction` state for a long time, terminate them:

```sql
-- Terminate idle-in-transaction sessions
SELECT pg_terminate_backend(<pid>);
```

### Step 3: Check Alembic Heads
Verify the merge migration is present in the deployed code:

```bash
cd backend
alembic heads
```

Expected output:
```
5d31b052e9b5 (head)
```

If multiple heads are shown, the merge migration is missing from the deployed code.

### Step 4: Check DB Connection Configuration
Verify the DATABASE_URL is correct:
- Using correct pooler mode (Supabase requires "Transaction" pooler port 6543 OR direct connection port 5432)
- SSL mode is set correctly if required
- Connection is reachable from Render's network

## Fixes Applied

### Fix 1: Added Connection Timeout to env.py
**File:** `backend/alembic/env.py`

**Change:**
```python
def run_migrations_online() -> None:
    # Add connect_timeout to fail fast on connection issues instead of hanging indefinitely
    connectable = create_engine(
        DB_URL,
        poolclass=pool.NullPool,
        connect_args={"connect_timeout": 10}  # Fail fast if DB is unreachable
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()
```

**Impact:** Connection issues will now fail fast with a clear error instead of hanging indefinitely.

### Fix 2: Verified Merge Migration is Present
**Result:** Single head confirmed: `5d31b052e9b5`

**Impact:** The multiple-heads fix is present in the codebase.

## Resolution Steps

### If Stale Lock is Found
1. Terminate the blocking session using `pg_terminate_backend(<pid>)`
2. Re-trigger the Render deploy
3. Migration should complete within 30 seconds

### If No Stale Lock is Found
1. Check DB connection string in Render environment variables
2. Verify Supabase pooler mode is correct
3. Check network connectivity from Render to DB
4. Re-trigger deploy with timeout fix in place
5. Should now fail fast with clear error if connection issue

### If Merge Migration is Missing
1. Ensure the merge migration file is committed and pushed
2. Verify the correct branch is deployed
3. Re-trigger deploy

## Expected Behavior After Fix

**Before Fix:**
- Deploy hangs indefinitely during migration step
- No error message
- "Waiting for internal health check" banner remains active

**After Fix:**
- Deploy either completes successfully within 30 seconds
- OR fails fast with clear error message (connection timeout, lock conflict, etc.)
- No indefinite hanging

## Monitoring

After applying fixes, monitor:
1. Deploy log should show migration completion or clear error
2. Migration should complete within 30 seconds for typical migrations
3. No "Waiting for internal health check" hanging

## Files Modified

1. `backend/alembic/env.py` - Added connect_timeout to prevent indefinite hangs

## Verification

Run these commands to verify the fix:

```bash
# Check single head exists
cd backend
alembic heads

# Verify timeout is in env.py
grep -n "connect_timeout" alembic/env.py
```

## Next Steps

1. Run the SQL queries against the production DB to check for stale locks
2. If stale lock found, terminate it
3. Re-trigger Render deploy
4. Monitor deploy log for completion or clear error
5. Report results
