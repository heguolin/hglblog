FROM python:3.12-slim

WORKDIR /app

# 先装依赖（利用 Docker 缓存层）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY . .

EXPOSE 8002

# 模型路径通过环境变量 EMBEDDING_MODEL 指定，默认 BAAI/bge-small-zh（需联网）
# 国内服务器设 EMBEDDING_MODEL=/app/models/bge-small-zh 使用本地模型
CMD ["fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "8002"]
