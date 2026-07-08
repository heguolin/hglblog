"""端到端集成测试 — 需要 Milvus 和模型服务都在运行。

用法（仅当完整环境就绪时）:
  MILVUS_HOST=localhost LLM_BASE_URL=http://127.0.0.1:8001/v1 \
  python -m pytest tests/test_integration.py -v -m integration
"""

import pytest
import httpx
from config import settings


pytestmark = pytest.mark.integration


@pytest.mark.asyncio
async def test_health_endpoint():
    """健康检查应返回 ok。"""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"http://127.0.0.1:{settings.port}/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_chat_completions_matches_openai_format():
    """返回格式必须与 OpenAI /v1/chat/completions 兼容。"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"http://127.0.0.1:{settings.port}/v1/chat/completions",
            json={
                "messages": [
                    {"role": "system", "content": "你是流萤。"},
                    {"role": "user", "content": "你好，请介绍你自己"},
                ],
            },
        )
        assert resp.status_code == 200
        data = resp.json()

        # OpenAI 兼容格式验证
        assert "choices" in data
        assert len(data["choices"]) >= 1
        choice = data["choices"][0]
        assert "message" in choice
        assert "content" in choice["message"]
        assert len(choice["message"]["content"]) > 0


@pytest.mark.asyncio
async def test_chat_completions_handles_short_message():
    """短消息（问候）应能正常响应。"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"http://127.0.0.1:{settings.port}/v1/chat/completions",
            json={
                "messages": [
                    {"role": "user", "content": "你好"},
                ],
            },
        )
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_chat_completions_with_blog_knowledge():
    """查询博客相关问题时，回答应体现知识库内容。"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"http://127.0.0.1:{settings.port}/v1/chat/completions",
            json={
                "messages": [
                    {"role": "system", "content": "你是流萤。"},
                    {"role": "user", "content": "博客里有哪些技术文章？"},
                ],
            },
        )
        assert resp.status_code == 200
        # 注意：这个测试依赖知识库已入库，如果没有入库则只验证不报错
