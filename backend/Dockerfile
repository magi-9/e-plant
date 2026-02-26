FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Install DejaVu fonts for proper UTF-8 / Unicode support in PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create .env example if not exists
RUN touch .env

COPY . .

CMD ["python", "manage.py", "runserver", "0.0.0.0:5002"]
