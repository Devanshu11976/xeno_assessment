#!/usr/bin/env python3
"""
Railway worker entry point - starts RQ worker for background task processing
"""
import os
import sys
from redis import Redis
from rq import Worker, Queue
from app.config.settings import settings

def main():
    """Start RQ worker to process background tasks"""
    redis_conn = Redis.from_url(settings.REDIS_URL)
    queue = Queue("default", connection=redis_conn)
    
    worker = Worker([queue], connection=redis_conn)
    
    print(f"Starting RQ worker for queue: default")
    print(f"Redis URL: {settings.REDIS_URL}")
    
    worker.work(with_scheduler=True)

if __name__ == "__main__":
    main()
