"""Qwen3-0.6B 模型调用客户端 — 异步 HTTP，超时降级。"""

import logging
import time
from typing import List, Optional
import httpx
from config import settings
from schemas.chat import ChatMessage, ChatResponse, Usage

logger = logging.getLogger("rag.llm_client")


class LlmClient:
    def __init__(self, base_url: str | None = None):
        self._base_url = (base_url or settings.llm_base_url).rstrip("/")
        self._timeout = httpx.Timeout(settings.llm_timeout)
        self._client = httpx.AsyncClient(timeout=self._timeout)

    async def chat(
        self,
        messages: List[ChatMessage],
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> ChatResponse:
        """调用 Qwen3-0.6B 聊天接口。

        Args:
            messages: OpenAI 格式消息列表（已注入检索上下文）。
            temperature: 生成温度，默认 0.7。
            max_tokens: 最大生成长度，默认 1024。

        Returns:
            ChatResponse，失败时返回降级回复。
        """
        payload = {
            "messages": [m.model_dump() for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        start = time.monotonic()
        try:
            resp = await self._client.post(
                f"{self._base_url}/chat/completions",
                json=payload,
            )
            elapsed = time.monotonic() - start

            if resp.status_code == 200:
                data = resp.json()
                model_name = data.get("model", "unknown")
                usage = Usage()
                if "usage" in data:
                    usage = Usage(**data["usage"])
                logger.info(
                    "LLM call succeeded — model=%s elapsed=%.2fs "
                    "tokens={prompt: %d, completion: %d, total: %d}",
                    model_name, elapsed,
                    usage.prompt_tokens, usage.completion_tokens, usage.total_tokens,
                )
                return ChatResponse(choices=data["choices"], usage=usage)
            else:
                logger.warning(
                    "LLM returned status %d elapsed=%.2fs body=%.200s",
                    resp.status_code, elapsed, resp.text,
                )

        except Exception as e:
            elapsed = time.monotonic() - start
            logger.exception(
                "LLM call failed after %.2fs: %s: %s", elapsed, type(e).__name__, e,
            )

        # 降级回复
        logger.info("LLM call failed — using fallback reply.")
        return ChatResponse(
            choices=[{
                "index": 0,
                "message": {"role": "assistant", "content": settings.fallback_reply},
            }]
        )
