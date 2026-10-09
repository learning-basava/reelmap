FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 HOST=0.0.0.0 PORT=8080
RUN pip install --no-cache-dir fastapi uvicorn httpx python-multipart
COPY index.html server.py ./
EXPOSE 8080
CMD ["python", "server.py"]
