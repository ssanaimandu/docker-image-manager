# =============================================================
# Docker Image Manager – Multi-stage Dockerfile
# =============================================================

# Stage 1: Build React frontend
FROM node:22-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python backend + static files
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend
COPY backend/ ./

# Copy built frontend into static dir for FastAPI to serve
COPY --from=frontend-build /app/frontend/dist ./static/

# Default config
COPY config/ /app/config/

# Environment defaults
ENV DIM_WEB_PORT=8080
ENV DIM_CONFIG_PATH=/app/config/config.json
ENV DIM_LOG_LEVEL=INFO

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
