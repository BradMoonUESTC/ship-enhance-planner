FROM node:22-bookworm AS web
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY index.html ./index.html
COPY src ./src
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend ./backend
COPY --from=web /app/dist ./dist
ENV PYTHONPATH=/app/backend
EXPOSE 8000
CMD ["sh", "-c", "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
