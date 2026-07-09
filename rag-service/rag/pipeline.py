"""RAG 管线编排 — 检索→注入→调用，含降级逻辑。"""

import logging
from typing import List, Optional
from services.embedding import EmbeddingService
from services.retriever import Retriever
from services.llm_client import LlmClient
from schemas.chat import ChatMessage, ChatResponse
from config import settings

logger = logging.getLogger("rag.pipeline")

# 博客知识类关键词 — 命中则走 RAG，否则纯角色聊天
BLOG_KEYWORDS = [
    "博客", "文章", "写过", "写了", "发布", "发表的", "写过什么",
    "网站", "网页", "杂谈", "相册", "照片", "友链", "关于",
    "有什么", "介绍", "内容", "写过哪些", "写过什么",
    "写了什么", "写了哪些", "什么文章", "哪些文章", "什么内容",
    "技术", "代码", "编程", "AI", "大模型", "模型",
    "部署", "Docker", "服务器", "后端", "前端", "项目",
    "你和博客", "博客里", "博主", "站长", "管理员",
]


def _is_blog_question(text: str) -> bool:
    """判断是否在问博客相关内容。"""
    for kw in BLOG_KEYWORDS:
        if kw in text:
            return True
    return False


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
        """处理聊天请求：检索知识 → 注入上下文 → 调用模型。"""
        user_messages = [m for m in messages if m.role == "user"]
        if not user_messages:
            return await self._llm.chat(messages, temperature=temperature, max_tokens=max_tokens)

        last_user = user_messages[-1].content.strip()

        # 不是博客问题 → 纯角色聊天，不走 RAG
        if not _is_blog_question(last_user):
            logger.info("Casual chat — skipping RAG, pure character mode")
            return await self._llm.chat(messages, temperature=temperature, max_tokens=max_tokens)

        # 博客问题 → 检索知识
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
            return await self._llm.chat(messages, temperature=temperature, max_tokens=max_tokens)

        # 有结果 → 强指令注入知识
        if docs:
            augmented = self._inject_context(messages, docs)
        else:
            augmented = messages

        return await self._llm.chat(augmented, temperature=temperature, max_tokens=max_tokens)

    def _inject_context(
        self, messages: List[ChatMessage], docs: List[dict]
    ) -> List[ChatMessage]:
        """将检索到的博客知识强制注入（知识类问题专用）。"""
        context_parts = [
            "【重要指令】以下是你从博客中真实看到的内容。你必须根据这些内容回答用户问题：",
            "---",
        ]
        for i, doc in enumerate(docs, 1):
            source_label = "文章" if doc["source_type"] == "post" else "杂谈"
            context_parts.append(
                f"片段{i}（{source_label}《{doc['title']}》）：{doc['content']}"
            )
        context_parts.append("---")
        context_parts.append("规则：只回答以上内容里有的信息。用流萤的语气。不知道就说「我不太清楚」。不要编造。")
        context_text = "\n".join(context_parts)

        result = []
        for m in messages:
            if m.role == "system":
                result.append(ChatMessage(
                    role="system",
                    content=f"{m.content}\n\n{context_text}",
                ))
            else:
                result.append(m)

        if not any(m.role == "system" for m in messages):
            result.insert(0, ChatMessage(role="system", content=context_text))

        return result
