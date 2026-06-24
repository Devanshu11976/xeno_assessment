# Keep-Alive Endpoint Setup for Worker Inactivity Prevention

## Overview
The `/api/ping` endpoint is designed to prevent worker shutdown due to inactivity on free-tier platforms (Render, Railway). By calling this endpoint every 10 minutes via external cron jobs or monitoring services, you can keep the worker active without requiring a paid plan.

## Endpoint Details

**URL:** `https://stratos-api.onrender.com/api/ping`

**Method:** GET

**Authentication:** None required (public endpoint)

**Response:**
```json
{
  "status": "pong",
  "message": "Keep-alive successful"
}
```

**What it does:**
- Performs a lightweight Redis `ping()` operation
- Generates activity to prevent platform inactivity detection
- Returns success/failure status

## Setup Options

### Option 1: Cron-Job.org (Free, Recommended)

1. Go to [cron-job.org](https://cron-job.org)
2. Sign up for a free account
3. Create a new cron job:
   - **Title:** Stratos Worker Keep-Alive
   - **URL:** `https://stratos-api.onrender.com/api/ping`
   - **Execution:** Every 10 minutes
   - **Save responses:** No (optional)

### Option 2: EasyCron (Free Tier Available)

1. Go to [easycron.com](https://www.easycron.com)
2. Sign up for free account
3. Create cron job:
   - **Cron Expression:** `*/10 * * * *` (every 10 minutes)
   - **URL:** `https://stratos-api.onrender.com/api/ping`

### Option 3: GitHub Actions (Free)

Create `.github/workflows/keep-alive.yml`:

```yaml
name: Keep-Alive Worker

on:
  schedule:
    - cron: '*/10 * * * *'  # Every 10 minutes
  workflow_dispatch:  # Allow manual trigger

jobs:
  keep-alive:
    runs-on: ubuntu-latest
    steps:
      - name: Ping API
        run: |
          curl -f https://stratos-api.onrender.com/api/ping
```

### Option 4: UptimeRobot (Free)

1. Go to [uptimerobot.com](https://uptimerobot.com)
2. Create new monitor:
   - **Monitor Type:** HTTP(s)
   - **URL:** `https://stratos-api.onrender.com/api/ping`
   - **Monitoring Interval:** 5 minutes (minimum free tier)
   - **Alert Contacts:** None (optional)

### Option 5: Local Cron Job (If you have a always-on server)

Add to your crontab:
```bash
*/10 * * * * curl -s https://stratos-api.onrender.com/api/ping > /dev/null
```

## Why Every 10 Minutes?

**Render Free Tier:** Spins down after 15 minutes of inactivity
**Railway Free Tier:** Spins down after 15 minutes of inactivity

By pinging every 10 minutes, we ensure activity before the 15-minute threshold, keeping the worker active.

## Testing the Endpoint

```bash
# Test the endpoint manually
curl https://stratos-api.onrender.com/api/ping

# Expected response
{"status": "pong", "message": "Keep-alive successful"}
```

## Monitoring

You can check if the keep-alive is working by:
1. Looking at the API logs for `/api/ping` requests
2. Checking that the worker stays active (no spin-down events)
3. Monitoring the response time of the ping endpoint

## Alternative: Internal Keep-Alive

The worker also has built-in keep-alive mechanisms:
- **Heartbeat thread** performs Redis operations every 20 seconds
- **HTTP server** on port 8001 responds to health checks
- **Docker health checks** run every 30 seconds

These internal mechanisms work together with the external `/api/ping` endpoint to provide multiple layers of protection against inactivity shutdown.

## Comparison: External vs Internal Keep-Alive

| Method | Pros | Cons |
|--------|------|------|
| **External Cron (`/api/ping`)** | - Works even if worker crashes<br>- Simple to set up<br>- Platform-independent | - Requires external service<br>- Depends on third-party uptime |
| **Internal Heartbeat** | - No external dependencies<br>- Always running with worker | - Only works if worker is alive<br>- Platform may not detect as "activity" |
| **HTTP Server (port 8001)** | - Platform health checks work<br>- Standard approach | - Requires platform to support health checks<br>- Port must be exposed |

**Recommendation:** Use both external cron (`/api/ping`) and internal mechanisms for maximum reliability.

## Troubleshooting

**Worker still spins down:**
- Check cron job is actually running (check logs)
- Verify the API URL is correct
- Ensure the endpoint returns 200 status
- Check if platform has different inactivity thresholds

**Endpoint returns error:**
- Check API service is running
- Verify Redis connection is healthy
- Check platform logs for errors

**Cron job fails:**
- Verify cron service is operational
- Check URL is accessible from cron service
- Ensure no firewall blocking requests

## Security Considerations

The `/api/ping` endpoint is intentionally public (no authentication) to simplify cron job setup. Since it only performs a lightweight Redis ping operation and returns minimal data, the security risk is minimal.

If you want to add authentication:
```python
@get("/api/ping")
async def ping_endpoint(api_key: str = None) -> dict[str, str]:
    if api_key != os.getenv("PING_API_KEY"):
        return {"status": "error", "message": "Unauthorized"}
    # ... rest of the code
```

Then update your cron job URL:
```
https://stratos-api.onrender.com/api/ping?api_key=YOUR_SECRET_KEY
```
