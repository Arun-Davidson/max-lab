FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libmagic1 \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PORT=5001
ENV PYTHONUNBUFFERED=1

EXPOSE 5001

CMD ["python", "app.py"]