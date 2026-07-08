"""RagPipeline 单元测试 — mock 所有外部依赖。"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from schemas.chat import ChatMessage, ChatResponse
from rag.pipeline import RagPipeline


def make_messages(user_text: str) -> list:
    """构建带 system prompt 的标准消息列表。"""
    return [
        ChatMessage(role="system", content="你是流萤。"),
        ChatMessage(role="user", content=user_text),
    ]


@pytest.fixture
def mock_embedding():
    mock = MagicMock()
    mock.encode.return_value = [[0.1] * 512]
    return mock


@pytest.fixture
def mock_retriever():
    mock = MagicMock()
    mock.search.return_value = [
        {
            "content": "博客最近更新了 Docker 部署教程。",
            "score": 0.87,
            "source_type": "post",
            "source_id": 1,
            "title": "Docker部署指南",
            "slug": "docker-guide",
            "created_at": 1720410000,
        },
    ]
    return mock


@pytest.fixture
def mock_llm():
    mock = AsyncMock()
    mock.chat.return_value = ChatResponse(
        choices=[{"index": 0, "message": {"role": "assistant", "content": "你最近写了Docker教程哦~"}}]
    )
    return mock


@pytest.mark.asyncio
async def test_pipeline_injects_context(mock_embedding, mock_retriever, mock_llm):
    """检索到文档时，应将其注入 system message 并调用模型。"""
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("我最近写了什么？")

    result = await pipeline.run(messages)

    # 验证模型被调用
    mock_llm.chat.assert_called_once()
    called_messages = mock_llm.chat.call_args[0][0]
    # system message 应该包含注入的上下文
    system_content = called_messages[0].content
    assert "Docker部署指南" in system_content
    assert "参考知识" in system_content
    # 模型响应正确返回
    assert "Docker" in result.choices[0].message.content


@pytest.mark.asyncio
async def test_pipeline_skips_short_message(mock_embedding, mock_retriever, mock_llm):
    """短消息（<5字）跳过检索，直接调模型。"""
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("你好")

    result = await pipeline.run(messages)

    # 检索不应被调用
    mock_embedding.encode.assert_not_called()
    mock_retriever.search.assert_not_called()
    # 但模型仍应被调用
    mock_llm.chat.assert_called_once()


@pytest.mark.asyncio
async def test_pipeline_empty_retrieval_passes_through(mock_embedding, mock_retriever, mock_llm):
    """检索无结果时，原封不动调模型。"""
    mock_retriever.search.return_value = []
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("今天服务器状态怎么样？")

    result = await pipeline.run(messages)

    called_messages = mock_llm.chat.call_args[0][0]
    # system message 不应被修改
    assert called_messages[0].content == "你是流萤。"


@pytest.mark.asyncio
async def test_pipeline_retrieval_error_graceful_degradation(mock_embedding, mock_retriever, mock_llm):
    """检索抛异常时，降级为裸聊天，不应中断。"""
    mock_retriever.search.side_effect = RuntimeError("Milvus connection lost")
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("我最近写了什么？")

    result = await pipeline.run(messages)

    # 仍应成功返回
    mock_llm.chat.assert_called_once()
