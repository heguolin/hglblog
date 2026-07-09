"""RAG 管线编排 — 检索→注入→调用，含降级逻辑。"""

import logging
from typing import List, Optional
from services.embedding import EmbeddingService
from services.retriever import Retriever
from services.llm_client import LlmClient
from schemas.chat import ChatMessage, ChatResponse
from config import settings

logger = logging.getLogger("rag.pipeline")


class RagPipeline:
    def __init__(
        self,
        embedding: EmbeddingService,
        retriever: Retriever,
        llm: LlmClient,
    ):
        self._embedding = embedding
        self._retriever = retriever
        self._llm = llm

    async def run(
        self,
        messages: List[ChatMessage],
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> ChatResponse:
        """处理聊天请求：检索知识 → 注入上下文 → 调用模型。

        Args:
            messages: 对话历史（含 system prompt 和 user messages）。
            temperature: 生成温度。
            max_tokens: 最大生成长度。

        Returns:
            模型回复或降级回复。
        """
        # 1. 提取最后一条用户消息
        user_messages = [m for m in messages if m.role == "user"]
        if not user_messages:
            return await self._llm.chat(messages, temperature=temperature, max_tokens=max_tokens)

        last_user = user_messages[-1].content.strip()

        # 2. 短消息跳过检索
        if len(last_user) < settings.retrieval_skip_min_chars:
            logger.debug("Skipping retrieval: query too short (%d chars)", len(last_user))
            return await self._llm.chat(messages, temperature=temperature, max_tokens=max_tokens)

        # 3. 检索
        try:
            vector = self._embedding.encode([last_user])[0]
            docs = self._retriever.search(vector)
            logger.info(
                "Retrieval — query=%.100s results=%d scores=%s",
                last_user, len(docs),
                [f"{d.get('score', 0):.4f}" for d in docs],
            )
        except Exception as e:
            logger.warning("Retrieval failed (%s: %s) — falling back to bare chat", type(e).__name__, e)
            # 检索失败 → 降级为裸聊天
            return await self._llm.chat(messages, temperature=temperature, max_tokens=max_tokens)

        # 4. 注入上下文到 system message
        if docs:
            augmented = self._inject_context(messages, docs)
        else:
            augmented = messages

        # 5. 调用模型
        return await self._llm.chat(augmented, temperature=temperature, max_tokens=max_tokens)

    # ---------- 内部方法 ----------

    def _inject_context(
        self, messages: List[ChatMessage], docs: List[dict]
    ) -> List[ChatMessage]:
        """将检索到的文档注入 system message 末尾。"""
        # 用自然的方式注入知识，不破坏角色感
        context_parts = [
            "（以下是你通过博客看到的信息，可以用流萤的语气自然地提到：）",
            "---",
        ]
        for i, doc in enumerate(docs, 1):
            source_label = "文章" if doc["source_type"] == "post" else "杂谈"
            context_parts.append(
                f"《{doc['title']}》（{source_label}）：{doc['content']}"
            )
        context_parts.append("---")
        context_parts.append("你可以自然地聊这些内容，用流萤的语气。不知道的就诚实说不太清楚。")
        context_text = "\n".join(context_parts)

        # 复制消息列表，修改 system message
        result = []
        for m in messages:
            if m.role == "system":
                result.append(ChatMessage(
                    role="system",
                    content=f"{m.content}\n\n{context_text}",
                ))
            else:
                result.append(m)

        # 如果消息列表没有 system message，在开头插入
        if not any(m.role == "system" for m in messages):
            result.insert(0, ChatMessage(role="system", content=context_text))

        return result
