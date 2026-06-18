#!/usr/bin/env python3
"""
Railway startup script - runs either API server or worker based on RAILWAY_SERVICE_NAME
"""
import os
import sys
import subprocess

def main():
    service_name = os.environ.get("RAILWAY_SERVICE_NAME", "api")
    
    if service_name == "worker":
        # Start RQ worker
        print("Starting RQ worker...")
        subprocess.run([
            "python", "-m", "rq.cli", 
            "worker", 
            "--url", os.environ.get("REDIS_URL", "redis://localhost:6379"),
            "default"
        ])
    else:
        # Start API server with migrations
        print("Starting API server...")
        subprocess.run(["alembic", "upgrade", "head"], check=True)
        subprocess.run(["python", "main.py"])

if __name__ == "__main__":
    main()
