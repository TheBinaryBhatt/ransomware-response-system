FROM python:3.11-slim-bookworm

WORKDIR /app

# Install system dependencies (including build tools for llama-cpp-python)
RUN apt-get update && apt-get install -y \
  gcc \
  g++ \
  build-essential \
  cmake \
  curl \
  libssl-dev \
  && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
  pip install --no-cache-dir -r requirements.txt && \
  pip install --no-cache-dir langchain llama-cpp-python

# Copy shared library and install
COPY shared_lib/ ./shared_lib/
RUN pip install -e ./shared_lib

# Copy all services and core modules
COPY core/ ./core/
COPY ingestion_service/ ./ingestion_service/
COPY triage_service/ ./triage_service/
COPY response_service/ ./response_service/
COPY audit_service/ ./audit_service/
COPY gateway/ ./gateway/

# Copy LLM model file
COPY triage_service/models/Hermes-2-Pro-Mistral-7B.Q8_0.gguf triage_service/models/

# Create __init__.py files for all dirs
RUN find . -type d -exec touch {}/__init__.py \;

# Set Python path
ENV PYTHONPATH="/app:/app/core:/app/shared_lib/src:/app/ingestion_service:/app/triage_service:/app/response_service:/app/audit_service:/app/gateway"

# Expose all service ports
EXPOSE 8000 8001 8002 8003 8004

# Default command (overridden by docker-compose)
CMD ["python", "-m", "gateway.main"]
