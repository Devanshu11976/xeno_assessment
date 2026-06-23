#!/usr/bin/env python3
"""
Railway worker entry point - starts RQ worker for background task processing
"""
import os
import sys
import time
import threading
from rq import Worker, Queue
from app.config.settings import settings
from app.utils.redis_manager import redis_manager, redis_health_check

def main():
    """Start RQ worker to process background tasks"""
    # Get Redis connection from centralized manager
    max_retries = 5
    redis_conn = None
    for attempt in range(max_retries):
        try:
            redis_conn = redis_manager.get_connection()
            print(f"Redis connection established on attempt {attempt + 1}")
            break
        except Exception as exc:
            print(f"Redis connection attempt {attempt + 1} failed: {exc}")
            if attempt == max_retries - 1:
                print("Failed to establish Redis connection after maximum retries")
                raise
            print(f"Retrying in 2 seconds...")
            time.sleep(2)
    queue = Queue("default", connection=redis_conn)
    
    worker = Worker([queue], connection=redis_conn)
    
    print(f"Starting RQ worker for queue: default")
    print(f"Redis URL: {settings.REDIS_URL}")
    
    # Start heartbeat thread to monitor connection
    stop_event = threading.Event()
    
    def heartbeat():
        """Periodically check Redis connection and restart worker if lost"""
        while not stop_event.is_set():
            try:
                time.sleep(20)  # Check every 20 seconds (reduced from 30)
                if not redis_health_check():
                    raise ConnectionError("Redis health check failed")
            except Exception as exc:
                print(f"Heartbeat: Redis connection lost: {exc}")
                print("Heartbeat: Triggering worker restart...")
                stop_event.set()
                # Force worker to exit by raising an exception
                os._exit(1)
    
    heartbeat_thread = threading.Thread(target=heartbeat, daemon=True)
    heartbeat_thread.start()
    
    worker.work(with_scheduler=True)

def run_with_restart():
    """Run worker with automatic restart on exit or connection loss"""
    while True:
        try:
            main()
        except Exception as e:
            print(f"Worker exited with error: {e}")
            print("Restarting in 5 seconds...")
            time.sleep(5)

if __name__ == "__main__":
    # Check if auto-restart is enabled (default for production)
    if os.getenv("AUTO_RESTART_WORKER", "true").lower() == "true":
        run_with_restart()
    else:
        main()
