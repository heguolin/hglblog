FROM python:3.12-slim

WORKDIR /app

# 先装依赖（利用 Docker 缓存层）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 预下载 BGE 模型（避免启动时下载）
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-zh')"

# 复制源码
COPY . .

EXPOSE 8002
CMD ["fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "8002"]
