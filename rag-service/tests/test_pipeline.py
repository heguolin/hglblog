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
async def test_blog_question_triggers_rag(mock_embedding, mock_retriever, mock_llm):
    """博客相关问题触发检索，注入上下文。"""
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("我博客里有什么文章？")

    result = await pipeline.run(messages)

    mock_llm.chat.assert_called_once()
    called_messages = mock_llm.chat.call_args[0][0]
    system_content = called_messages[0].content
    assert "Docker部署指南" in system_content
    assert "Docker" in result.choices[0].message.content


@pytest.mark.asyncio
async def test_casual_chat_skips_rag(mock_embedding, mock_retriever, mock_llm):
    """非博客问题（闲聊）跳过 RAG，纯角色模式。"""
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("你好呀，今天心情怎么样？")

    result = await pipeline.run(messages)

    mock_embedding.encode.assert_not_called()
    mock_retriever.search.assert_not_called()
    mock_llm.chat.assert_called_once()


@pytest.mark.asyncio
async def test_empty_retrieval_still_queries_llm(mock_embedding, mock_retriever, mock_llm):
    """博客问题但无匹配知识时，正常调模型不注入。"""
    mock_retriever.search.return_value = []
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("博客里有什么前端项目？")

    result = await pipeline.run(messages)

    called_messages = mock_llm.chat.call_args[0][0]
    assert called_messages[0].content == "你是流萤。"


@pytest.mark.asyncio
async def test_retrieval_error_graceful_degradation(mock_embedding, mock_retriever, mock_llm):
    """检索抛异常时降级为裸聊天，不应中断。"""
    mock_retriever.search.side_effect = RuntimeError("Chroma connection lost")
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("我最近写了什么？")

    result = await pipeline.run(messages)

    mock_llm.chat.assert_called_once()
