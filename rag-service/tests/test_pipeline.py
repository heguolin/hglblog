"""RagPipeline 单元测试 — 单模型 + prompt 切换。"""

import pytest
from unittest.mock import AsyncMock, MagicMock
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
async def test_blog_question_replaces_system_prompt(mock_embedding, mock_retriever, mock_llm):
    """博客问题应替换 system prompt 为知识助手模式（去掉角色人设）。"""
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("我的博客里有什么文章？")

    await pipeline.run(messages)

    mock_llm.chat.assert_called_once()
    called_messages = mock_llm.chat.call_args[0][0]
    system_content = called_messages[0].content
    # 应包含知识助手 prompt（不含角色设定）
    assert "博客内容搜索工具" in system_content
    assert "Docker部署指南" in system_content
    # 不应包含角色人设
    assert "你是流萤" not in system_content


@pytest.mark.asyncio
async def test_casual_chat_keeps_character_prompt(mock_embedding, mock_retriever, mock_llm):
    """闲聊保持角色 prompt 不变，不检索。"""
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("你好呀，今天心情怎么样？")

    await pipeline.run(messages)

    mock_llm.chat.assert_called_once()
    called_messages = mock_llm.chat.call_args[0][0]
    # system prompt 应保持不变
    assert called_messages[0].content == "你是流萤。"
    # 不应触发检索
    mock_embedding.encode.assert_not_called()


@pytest.mark.asyncio
async def test_empty_retrieval_passes_through(mock_embedding, mock_retriever, mock_llm):
    """auto 模式下无匹配知识时，正常调模型不替换 prompt。"""
    mock_retriever.search.return_value = []
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("博客里有什么前端项目？")

    await pipeline.run(messages, mode="auto")

    called_messages = mock_llm.chat.call_args[0][0]
    assert called_messages[0].content == "你是流萤。"


@pytest.mark.asyncio
async def test_knowledge_mode_empty_returns_not_found(mock_embedding, mock_retriever, mock_llm):
    """knowledge 模式下无匹配知识时，直接返回「没找到」，不调模型。"""
    mock_retriever.search.return_value = []
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("博客里有什么前端项目？")

    result = await pipeline.run(messages, mode="knowledge")

    mock_llm.chat.assert_not_called()
    assert "没有和这个相关" in result.choices[0].message.content


@pytest.mark.asyncio
async def test_knowledge_mode_returns_chunks_directly(mock_embedding, mock_retriever, mock_llm):
    """knowledge 模式下有结果时，直接返回检索片段，不调模型。"""
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("Claude Code 怎么快速上手？")

    result = await pipeline.run(messages, mode="knowledge")

    # 不调模型
    mock_llm.chat.assert_not_called()
    # 直接返回检索片段
    content = result.choices[0].message.content
    assert "在博客里找到了这些相关内容" in content
    assert "Docker部署指南" in content


@pytest.mark.asyncio
async def test_retrieval_error_graceful_degradation(mock_embedding, mock_retriever, mock_llm):
    """检索抛异常时降级，不应中断。"""
    mock_retriever.search.side_effect = RuntimeError("Chroma connection lost")
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("我最近写了什么？")

    result = await pipeline.run(messages)

    mock_llm.chat.assert_called_once()
