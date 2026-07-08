"""流萤 RAG 服务 — FastAPI 入口，管理服务生命周期。"""

import asyncio
import logging
from contextlib import asynccontextmanager
from pydantic import BaseModel
from fastapi import FastAPI
from config import settings
from services.embedding import EmbeddingService
from services.retriever import Retriever
from services.llm_client import LlmClient
from rag.pipeline import RagPipeline
from api.chat import router as chat_router, set_pipeline
from ingestion.indexer import run_incremental

logger = logging.getLogger("rag.main")

# Module-level reference to embedding model (reused by reindex webhook)
_embedding: EmbeddingService | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动：加载模型 + 初始化 Chroma + 初始化 pipeline。"""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

    # ===== startup =====
    logger.info("Loading BGE-small-zh model...")
    embedding = EmbeddingService()
    embedding.load_model()
    global _embedding
    _embedding = embedding
    logger.info("Embedding model loaded.")

    logger.info("Connecting to Chroma (in-process)...")
    retriever = Retriever()
    retriever.connect()
    retriever.create_collection(drop_existing=False)
    logger.info("Chroma ready (data: %s).", settings.chroma_persist_path)

    llm = LlmClient()
    pipeline = RagPipeline(embedding, retriever, llm)
    set_pipeline(pipeline)
    logger.info("Pipeline ready, listening on port %d", settings.port)

    yield  # ===== app running =====

    # ===== shutdown =====
    logger.info("Shutting down.")


app = FastAPI(
    title="Firefly RAG Service",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(chat_router)


class ReindexRequest(BaseModel):
    source_type: str  # "post" | "chatter"
    source_id: int


async def _run_reindex_wrapped(
    source_type: str, source_id: int, embedding: EmbeddingService,
) -> None:
    """带错误日志的增量索引包装。"""
    try:
        await run_incremental(source_type, source_id, embedding=embedding)
    except Exception:
        logger.exception(
            "Reindex failed for %s#%d", source_type, source_id,
        )


@app.post("/api/rag/reindex")
async def reindex(request: ReindexRequest):
    """增量索引 Webhook — NestJS 在文章/杂谈变更时调用。"""
    asyncio.create_task(
        _run_reindex_wrapped(request.source_type, request.source_id, _embedding)
    )
    return {"status": "accepted"}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "firefly-rag"}
