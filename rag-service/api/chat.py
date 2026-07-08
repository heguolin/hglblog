"""OpenAI 兼容聊天接口 — 接收请求 → 调 RAG pipeline → 返回响应。"""

from fastapi import APIRouter, HTTPException
from schemas.chat import ChatRequest, ChatResponse
from rag.pipeline import RagPipeline

router = APIRouter(tags=["chat"])

# 由 main.py 在 startup 时注入
_pipeline: RagPipeline | None = None


def set_pipeline(pipeline: RagPipeline) -> None:
    """注入 pipeline 实例（main.py lifespan 中调用）。"""
    global _pipeline
    _pipeline = pipeline


@router.post("/v1/chat/completions", response_model=ChatResponse)
async def chat_completions(request: ChatRequest):
    """处理聊天补全请求。

    - 接收 OpenAI 格式消息列表
    - 通过 RAG pipeline 检索知识并生成回复
    - 返回 OpenAI 格式响应
    """
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="RAG pipeline not initialized")

    try:
        return await _pipeline.run(request.messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
