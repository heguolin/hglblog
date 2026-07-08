"""流萤 RAG 服务 — FastAPI 入口，管理服务生命周期。"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from config import settings
from services.embedding import EmbeddingService
from services.retriever import Retriever
from services.llm_client import LlmClient
from rag.pipeline import RagPipeline
from api.chat import router as chat_router, set_pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动：加载模型 + 连接 Milvus + 初始化 pipeline。
       关闭：释放资源。"""
    # ===== startup =====
    print("[rag] Loading BGE-small-zh model...")
    embedding = EmbeddingService()
    embedding.load_model()
    print("[rag] Embedding model loaded.")

    print(f"[rag] Connecting to Milvus at {settings.milvus_host}:{settings.milvus_port}...")
    retriever = Retriever()
    try:
        retriever.connect()
        retriever.create_collection(drop_existing=False)
        print("[rag] Milvus connected and collection ready.")
    except Exception as e:
        print(f"[rag] WARNING: Milvus unavailable ({e}) — RAG will run in pass-through mode.")

    llm = LlmClient()
    pipeline = RagPipeline(embedding, retriever, llm)
    set_pipeline(pipeline)
    print("[rag] Pipeline ready, listening on port", settings.port)

    yield  # ===== app running =====

    # ===== shutdown =====
    print("[rag] Shutting down.")


app = FastAPI(
    title="Firefly RAG Service",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(chat_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "firefly-rag"}
