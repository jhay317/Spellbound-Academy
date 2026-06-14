FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Environment variables configuration for Docker
ENV PORT=8000
ENV HOST=0.0.0.0
ENV DATA_DIR=/app/data
ENV OPEN_BROWSER=false

# Expose server port
EXPOSE 8000

# Start server
CMD ["python", "server.py"]
