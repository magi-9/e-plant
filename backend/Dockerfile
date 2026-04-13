FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Install DejaVu fonts for proper UTF-8 / Unicode support in PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create non-root user for security
RUN useradd -m -u 1000 appuser

COPY . .

# Create writable dirs for named volumes and fix ownership after COPY
# (COPY runs as root, so chown must come after to cover all app files)
RUN mkdir -p /app/staticfiles /app/media && chown -R appuser:appuser /app

USER appuser

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
