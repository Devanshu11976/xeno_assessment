# Redis Connection Pooling Fix - June 2026

## Problem
Redis connection timeouts occurring during worker operations:
```
redis.exceptions.TimeoutError: Timeout reading from socket
Worker aee952dcdc7949b6b1d73942ad5c7cf9: Redis connection timeout, quitting...
Worker aee952dcdc7949b6b1d73942ad5c7cf9: could not connect to Redis instance: Connection closed by server. retrying in 1 seconds...
```

## Root Cause
Previous fixes had individual Redis connections created in each component with inline configuration. This led to:
- No connection pooling - each request created a new connection
- Inconsistent connection parameters across components
- No centralized health monitoring
- Manual reconnection logic duplicated across files

## Solution
Implemented centralized Redis connection manager with connection pooling and automatic reconnection.

### Changes Made

#### 1. Created Centralized Connection Manager
**File:** `backend/app/utils/redis_manager.py` (NEW)

**Features:**
- Singleton pattern for single connection pool instance
- Connection pooling with `max_connections=10`
- Optimized TCP keepalive settings:
  - `TCP_KEEPIDLE: 10` - Start keepalive after 10s idle
  - `TCP_KEEPINTVL: 5` - Send probes every 5s
  - `TCP_KEEPCNT: 3` - Drop after 3 failed probes
- Reduced health check interval to 10 seconds (from 15)
- Automatic pool reinitialization on connection failures
- Health check method for monitoring
- Convenience functions: `get_redis_connection()`, `redis_health_check()`

**Connection Pool Settings:**
```python
ConnectionPool.from_url(
    settings.REDIS_URL,
    socket_keepalive=True,
    socket_keepalive_options={
        TCP_KEEPIDLE: 10,
        TCP_KEEPINTVL: 5,
        TCP_KEEPCNT: 3
    },
    socket_timeout=60,
    socket_connect_timeout=30,
    health_check_interval=10,    # Reduced from 15
    retry_on_timeout=True,
    max_connections=10,          # Connection pool size
    decode_responses=False,
)
```

#### 2. Updated Worker Startup
**File:** `backend/start_worker.py`

**Changes:**
- Removed inline Redis connection creation
- Now uses `redis_manager.get_connection()`
- Uses `redis_health_check()` in heartbeat thread
- Reduced heartbeat interval to 20 seconds (from 30)
- Simplified connection retry logic

**Before:**
```python
redis_conn = Redis.from_url(
    settings.REDIS_URL,
    socket_keepalive=True,
    socket_keepalive_options={...},
    socket_timeout=60,
    socket_connect_timeout=30,
    health_check_interval=15,
    retry_on_timeout=True,
    decode_responses=False
)
```

**After:**
```python
redis_conn = redis_manager.get_connection()
```

#### 3. Updated Tasks Module
**File:** `backend/app/workers/tasks.py`

**Changes:**
- Removed inline Redis connection creation in `__main__` block
- Now uses `redis_manager.get_connection()`
- Removed duplicate TCP keepalive constants
- Simplified connection retry logic

#### 4. Updated Upload API
**File:** `backend/app/api/upload.py`

**Changes:**
- Removed inline Redis connection creation
- Now uses `redis_manager.get_connection()`
- Removed duplicate TCP keepalive constants
- Simplified connection retry logic

## Benefits

### 1. Connection Pooling
- Reuses connections instead of creating new ones
- Reduces connection overhead
- Limits maximum connections to prevent resource exhaustion

### 2. Consistency
- Single source of truth for Redis connection settings
- All components use identical configuration
- Easier to maintain and update settings

### 3. Improved Stability
- Faster health checks (10s vs 15s)
- Faster heartbeat monitoring (20s vs 30s)
- Automatic pool reinitialization on failures
- Better detection of stale connections

### 4. Code Quality
- Eliminates code duplication
- Centralized error handling
- Easier to test and debug
- Follows DRY principle

## Testing Checklist

- [ ] Deploy updated code to production
- [ ] Monitor worker logs for connection messages
- [ ] Verify worker stays connected during idle periods (>30 minutes)
- [ ] Test connection recovery after transient failures
- [ ] Verify job processing continues without interruption
- [ ] Check Redis connection pool metrics

## Expected Behavior After Fix

1. **Stable Connections:** Worker maintains stable Redis connection during idle periods
2. **Faster Recovery:** Connection issues detected and recovered more quickly
3. **Resource Efficiency:** Connection pooling reduces overhead
4. **Consistent Behavior:** All components use identical connection settings
5. **Better Monitoring:** Centralized health checks provide clearer visibility

## Files Modified

1. `backend/app/utils/redis_manager.py` - NEW (centralized connection manager)
2. `backend/start_worker.py` - Updated to use connection manager
3. `backend/app/workers/tasks.py` - Updated to use connection manager
4. `backend/app/api/upload.py` - Updated to use connection manager

## Configuration Notes

**Connection Pool Settings:**
- `max_connections: 10` - Maximum connections in pool
- `health_check_interval: 10` - Health check every 10 seconds
- `socket_timeout: 60` - 60 second timeout for operations
- `socket_connect_timeout: 30` - 30 second timeout for initial connection

**Heartbeat Settings:**
- Interval: 20 seconds (reduced from 30)
- Uses centralized health check function
- Triggers worker restart on connection loss

**Auto-Restart:**
- Still controlled by `AUTO_RESTART_WORKER` environment variable
- Worker automatically restarts on connection failures
- 5 second delay between restart attempts
