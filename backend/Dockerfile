FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create .env example if not exists
RUN touch .env

COPY . .

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
