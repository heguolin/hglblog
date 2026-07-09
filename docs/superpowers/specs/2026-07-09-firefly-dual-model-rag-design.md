# 流萤双模型 RAG 设计文档

> 日期：2026-07-09 | 状态：已确认

## 1. 背景

### 1.1 问题

Qwen3-0.6B 微调角色模型同时承担"角色扮演"和"知识问答"两个任务，效果差：
- 角色模式好但编造内容（幻觉）
- 强指令注入后听话了但失去角色感
- 两者不可兼得——0.6B 模型能力上限

### 1.2 方案

双模型：微调角色模型负责日常聊天，未微调基座模型负责 RAG 知识问答。两个模型同时运行，按关键词路由。

---

## 2. 架构

```
用户消息
    │
    ▼
Python RAG (:8002)
    │
    ├─ 闲聊（非博客关键词）→ :8001  微调 Qwen3-0.6B + LoRA（流萤角色）
    │
    └─ 博客问题（命中关键词）→ :8003  Qwen3-0.6B 原始基座（准确回答）
                              ↑
                        注入检索到的博客知识
```

路由规则：命中 `BLOG_KEYWORDS`（博客/文章/写了/发布/技术/Docker/AI 等）→ 基座模型；其余 → 角色模型。

---

## 3. 资源配置（4C4G 服务器）

| 服务 | 端口 | 量化 | 内存 |
|------|------|------|------|
| 微调角色模型 | :8001 | FP32 | ~1.5GB |
| 基座 RAG 模型 | :8003 | INT8/GGUF | ~1.2GB |
| BGE-small-zh | 进程内 | FP32 | ~100MB |
| Chroma | 进程内 | — | ~200MB |
| PG + Redis + NestJS + Nginx | — | — | ~1GB |
| **合计** | | | **~4GB** |

---

## 4. 代码改动

### 4.1 config.py

```python
# 新增
rag_llm_base_url: str = "http://127.0.0.1:8003/v1"  # 基座模型（RAG 用）
```

### 4.2 pipeline.py

```python
class RagPipeline:
    def __init__(self, embedding, retriever, chat_llm, rag_llm):
        self._chat_llm = chat_llm   # :8001 角色聊天
        self._rag_llm = rag_llm     # :8003 知识问答

    async def run(self, messages, ...):
        if not _is_blog_question(last_user):
            return await self._chat_llm.chat(messages, ...)

        docs = ...
        augmented = self._inject_context(messages, docs)
        return await self._rag_llm.chat(augmented, ...)
```

注入 prompt 用简洁指令，不需要角色化：

```
【指令】根据以下博客内容回答用户问题。只回答内容里有的信息，不知道就说不知道。
---
片段1（文章《Docker部署指南》）：...
---
```

### 4.3 main.py

```python
chat_llm = LlmClient(base_url=settings.llm_base_url)      # :8001
rag_llm = LlmClient(base_url=settings.rag_llm_base_url)   # :8003
pipeline = RagPipeline(embedding, retriever, chat_llm, rag_llm)
```

---

## 5. 基座模型部署

推荐 llama.cpp + GGUF（CPU 友好，INT8 量化 ~1.2GB）：

```bash
# 1. 下载 Qwen3-0.6B 基座模型（非微调版）
# 从 HuggingFace 或 ModelScope 下载 GGUF 格式

# 2. 启动
./llama-server \
  -m Qwen3-0.6B-Q8_0.gguf \
  --host 127.0.0.1 --port 8003 \
  --ctx-size 2048

# 或 vLLM CPU 模式
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen3-0.6B \
  --port 8003 --dtype float16 --device cpu
```

---

## 6. 改动清单

| 文件 | 改动 | 说明 |
|------|------|------|
| `rag-service/config.py` | +1 行 | 新增 `rag_llm_base_url` |
| `rag-service/main.py` | ~5 行 | 初始化双 LlmClient |
| `rag-service/rag/pipeline.py` | ~10 行 | 双模型路由 |
| `rag-service/tests/test_pipeline.py` | ~15 行 | 更新测试 |
| 服务器 | 新增进程 | 基座模型 :8003 |

前端、Nginx、NestJS、入库管线均不改。
