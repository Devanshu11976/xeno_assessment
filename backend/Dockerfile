# Build stage
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Run stage
FROM python:3.11-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

COPY . .

# Make startup scripts executable
RUN chmod +x start_worker.py 2>/dev/null || true

# Expose Litestar default port (only used by API service, not worker)
EXPOSE 8000

# Check if this is a worker deployment by checking for RQ_WORKER environment variable
# If set, run the worker; otherwise run the API with migrations
CMD sh -c "if [ \"$RQ_WORKER\" = \"true\" ]; then python start_worker.py; else alembic upgrade head && python main.py; fi"
