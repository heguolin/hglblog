"""LlmClient 单元测试 — 使用 pytest-httpx mock 模型 API。"""

import pytest
from schemas.chat import ChatMessage, ChatResponse, ChatRequest
from services.llm_client import LlmClient


@pytest.mark.asyncio
async def test_chat_success(httpx_mock):
    """正常调用应返回模型回复。"""
    httpx_mock.add_response(
        url="http://127.0.0.1:8001/v1/chat/completions",
        method="POST",
        json={
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": "嘿嘿，我在呢~"}
            }],
            "usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
        },
    )

    client = LlmClient()
    messages = [ChatMessage(role="user", content="你好")]
    result = await client.chat(messages)

    assert isinstance(result, ChatResponse)
    assert len(result.choices) == 1
    assert result.choices[0].message.content == "嘿嘿，我在呢~"


@pytest.mark.asyncio
async def test_chat_timeout_returns_fallback(httpx_mock):
    """超时时返回降级回复，不抛出异常。"""
    import httpx
    httpx_mock.add_exception(
        url="http://127.0.0.1:8001/v1/chat/completions",
        method="POST",
        exception=httpx.TimeoutException("timeout"),
    )

    client = LlmClient()
    messages = [ChatMessage(role="user", content="你好")]
    result = await client.chat(messages)

    assert len(result.choices) == 1
    assert "走神" in result.choices[0].message.content


@pytest.mark.asyncio
async def test_chat_http_error_returns_fallback(httpx_mock):
    """模型返回 500 时返回降级回复。"""
    httpx_mock.add_response(
        url="http://127.0.0.1:8001/v1/chat/completions",
        method="POST",
        status_code=500,
    )

    client = LlmClient()
    result = await client.chat([ChatMessage(role="user", content="你好")])
    assert len(result.choices) == 1
    assert "走神" in result.choices[0].message.content
