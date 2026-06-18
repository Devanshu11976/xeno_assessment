# Railway Deployment Setup Guide

This guide explains how to deploy the Xeno backend to Railway with both API and worker services.

## Services Overview

The Xeno backend requires two services on Railway:

1. **API Service** - Handles HTTP requests for file uploads, job status, etc.
2. **Worker Service** - Processes background validation tasks using RQ (Redis Queue)

## Required Railway Services

### 1. PostgreSQL Database
- Create a PostgreSQL database in Railway
- Note the connection details (automatically available as Railway variables)

### 2. Redis Instance
- Create a Redis instance in Railway  
- This will be used by both the API (to enqueue tasks) and Worker (to process tasks)

### 3. API Service (Web Service)
- **Repository**: Connect to your GitHub repository
- **Root Directory**: `backend`
- **Build Command**: (Auto-detected from Dockerfile)
- **Start Command**: (Auto-detected from Dockerfile)
- **Environment Variables**:
  - `ENV`: `production`
  - `DEBUG`: `false`
  - `DB_HOST`: `${{RAILWAY_POSTGRES_HOST}}`
  - `DB_PORT`: `${{RAILWAY_POSTGRES_PORT}}`
  - `DB_USER`: `${{RAILWAY_POSTGRES_USER}}`
  - `DB_PASSWORD`: `${{RAILWAY_POSTGRES_PASSWORD}}`
  - `DB_NAME`: `${{RAILWAY_POSTGRES_DATABASE}}`
  - `REDIS_URL`: `${{RAILWAY_REDIS_URL}}`
  - `GROQ_API_KEY`: Your Groq API key
  - `SECRET_KEY`: (Generate a secure random string)
  - `UPLOAD_DIR`: `./uploads`
  - `OUTPUT_DIR`: `./outputs`
  - `NEXT_PUBLIC_API_URL`: Your frontend URL (for CORS if needed)

### 4. Worker Service (Worker Service)
- **Repository**: Connect to your GitHub repository (same as API)
- **Root Directory**: `backend`
- **Build Command**: (Auto-detected from Dockerfile)
- **Start Command**: `python -m rq.cli worker --url $REDIS_URL default`
- **Environment Variables**: Same as API service (all required for DB access, Redis, etc.)

## Setup Steps

### Step 1: Create Railway Project
1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Add PostgreSQL database
4. Add Redis instance

### Step 2: Deploy API Service
1. Click "New Service" → "Deploy from GitHub repo"
2. Select your repository
3. Set root directory to `backend`
4. Add all environment variables listed above
5. Deploy

### Step 3: Deploy Worker Service
1. Click "New Service" → "Deploy from GitHub repo"  
2. Select the same repository
3. Set root directory to `backend`
4. Set start command to: `python -m rq.cli worker --url $REDIS_URL default`
5. Add the same environment variables as the API service
6. Deploy

### Step 4: Verify Setup
1. Check API service logs to ensure it started successfully
2. Check worker service logs to ensure it connected to Redis
3. Test the API health endpoint: `https://your-api-url.railway.app/api/docs`

## Important Notes

- Both services need access to the same PostgreSQL database and Redis instance
- The worker service will automatically process jobs enqueued by the API service
- Railway automatically provides the database and Redis connection URLs as variables
- Make sure to set the `GROQ_API_KEY` for AI report generation

## Troubleshooting

### Worker not processing jobs:
- Check Redis connection in worker logs
- Verify `REDIS_URL` environment variable is set correctly
- Ensure both services are using the same Redis instance

### API errors:
- Check database connection logs
- Verify all environment variables are set
- Ensure PostgreSQL is accessible from the API service

### Build failures:
- Check Dockerfile is present in `backend/` directory
- Verify requirements.txt has all dependencies
- Check build logs for specific errors

## Monitoring

- Railway provides built-in logging for both services
- Monitor Redis queue length (can add Redis monitoring)
- Check PostgreSQL connection pool usage
- Monitor API response times and error rates