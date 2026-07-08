"""Qwen3-0.6B 模型调用客户端 — 异步 HTTP，超时降级。"""

from typing import List
import httpx
from config import settings
from schemas.chat import ChatMessage, ChatResponse


class LlmClient:
    def __init__(self):
        self._timeout = httpx.Timeout(settings.llm_timeout)

    async def chat(self, messages: List[ChatMessage]) -> ChatResponse:
        """调用 Qwen3-0.6B 聊天接口。

        Args:
            messages: OpenAI 格式消息列表（已注入检索上下文）。

        Returns:
            ChatResponse，失败时返回降级回复。
        """
        payload = {
            "messages": [m.model_dump() for m in messages],
            "temperature": 0.7,
            "max_tokens": 1024,
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(
                    f"{settings.llm_base_url}/chat/completions",
                    json=payload,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return ChatResponse(**data)
        except Exception:
            pass  # 降级到 fallback

        # 降级回复
        return ChatResponse(
            choices=[{
                "index": 0,
                "message": {"role": "assistant", "content": settings.fallback_reply},
            }]
        )
