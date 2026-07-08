"""RAG 管线编排 — 检索→注入→调用，含降级逻辑。"""

from typing import List
from services.embedding import EmbeddingService
from services.retriever import Retriever
from services.llm_client import LlmClient
from schemas.chat import ChatMessage, ChatResponse
from config import settings


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

    async def run(self, messages: List[ChatMessage]) -> ChatResponse:
        """处理聊天请求：检索知识 → 注入上下文 → 调用模型。

        Args:
            messages: 对话历史（含 system prompt 和 user messages）。

        Returns:
            模型回复或降级回复。
        """
        # 1. 提取最后一条用户消息
        user_messages = [m for m in messages if m.role == "user"]
        if not user_messages:
            return await self._llm.chat(messages)

        last_user = user_messages[-1].content.strip()

        # 2. 短消息跳过检索
        if len(last_user) < settings.retrieval_skip_min_chars:
            return await self._llm.chat(messages)

        # 3. 检索
        try:
            vector = self._embedding.encode([last_user])[0]
            docs = self._retriever.search(vector)
        except Exception:
            # 检索失败 → 降级为裸聊天
            return await self._llm.chat(messages)

        # 4. 注入上下文到 system message
        if docs:
            augmented = self._inject_context(messages, docs)
        else:
            augmented = messages

        # 5. 调用模型
        return await self._llm.chat(augmented)

    # ---------- 内部方法 ----------

    def _inject_context(
        self, messages: List[ChatMessage], docs: List[dict]
    ) -> List[ChatMessage]:
        """将检索到的文档注入 system message 末尾。"""
        # 构建上下文文本
        context_parts = ["【参考知识，用来回答用户问题】：", "---"]
        for i, doc in enumerate(docs, 1):
            source_label = "文章" if doc["source_type"] == "post" else "杂谈"
            context_parts.append(
                f"片段{i}（来源：{source_label}《{doc['title']}》）：{doc['content']}"
            )
        context_parts.append("---")
        context_parts.append("请根据以上知识回答，如果知识不足以回答就说不知道。")
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
