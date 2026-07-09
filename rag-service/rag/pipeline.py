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
        mode: str = "auto",
    ) -> ChatResponse:
        """处理聊天请求。mode: auto(自动判断) | chat(角色模式) | knowledge(知识模式)。"""
        user_messages = [m for m in messages if m.role == "user"]
        if not user_messages:
            return await self._llm.chat(messages, temperature=temperature, max_tokens=max_tokens)

        last_user = user_messages[-1].content.strip()

        # 强制角色模式 — 跳过检索，保留角色 prompt
        if mode == "chat":
            logger.info("Chat mode (forced) — keeping character prompt")
            return await self._llm.chat(messages, temperature=temperature, max_tokens=max_tokens)

        # 强制知识模式 — 始终检索
        if mode == "knowledge":
            logger.info("Knowledge mode (forced) — retrieving blog content")

        # auto 模式 — 关键词自动判断
        elif not _is_blog_question(last_user):
            logger.info("Auto mode — casual chat, keeping character prompt")
            return await self._llm.chat(messages, temperature=temperature, max_tokens=max_tokens)

        # 检索 + 替换 system prompt 为知识助手模式
        try:
            vector = self._embedding.encode([last_user])[0]
            docs = self._retriever.search(vector)
            logger.info(
                "Retrieval — query=%.100s mode=%s results=%d scores=%s",
                last_user, mode, len(docs),
                [f"{d.get('score', 0):.4f}" for d in docs],
            )
        except Exception as e:
            logger.warning("Retrieval failed (%s: %s) — falling back to bare chat", type(e).__name__, e)
            return await self._llm.chat(messages, temperature=temperature, max_tokens=max_tokens)

        if docs:
            augmented = self._inject_context(messages, docs)
        else:
            augmented = messages

        return await self._llm.chat(augmented, temperature=temperature, max_tokens=max_tokens)

    def _inject_context(
        self, messages: List[ChatMessage], docs: List[dict]
    ) -> List[ChatMessage]:
        """博客问题：替换 system prompt 为纯知识助手模式，去掉角色人设。"""
        # 构建知识片段
        fragments = []
        for i, doc in enumerate(docs, 1):
            source_label = "文章" if doc["source_type"] == "post" else "杂谈"
            fragments.append(
                f"{i}. [{source_label}《{doc['title']}》] {doc['content']}"
            )

        # 纯知识助手 prompt（无角色设定，强制引用知识）
        knowledge_system = (
            "你是一个准确的知识助手。你的任务是根据以下内容回答用户问题。\n"
            "规则：\n"
            "1. 只回答以下内容中有的信息，不要编造\n"
            "2. 如果内容不足以回答，直接说「没有找到相关信息」\n"
            "3. 回答要简洁、准确\n\n"
            "---博客内容---\n"
            + "\n".join(fragments) +
            "\n---"
        )

        # 替换现有 system message，或插入新的
        result = []
        replaced = False
        for m in messages:
            if m.role == "system":
                result.append(ChatMessage(role="system", content=knowledge_system))
                replaced = True
            else:
                result.append(m)

        if not replaced:
            result.insert(0, ChatMessage(role="system", content=knowledge_system))

        return result
