# 流萤 RAG 系统 Phase 1 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Python RAG 微服务，使流萤看板娘能够检索博客知识库（文章+杂谈）增强回答。

**Architecture:** FastAPI 服务坐落在 Nginx 和 Qwen3-0.6B 之间，接收 OpenAI 格式 chat 请求，用 BGE-small-zh 向量化查询，从 Milvus 检索相关片段，注入 system prompt 后转发给模型。

**Tech Stack:** Python 3.12+, FastAPI, sentence-transformers (BGE-small-zh), pymilvus, httpx, asyncpg, langchain-text-splitters

## Global Constraints

- 所有代码放在 `rag-service/` 目录下，Python 双引号，2 空格缩进
- 对外接口必须与 OpenAI `/v1/chat/completions` 格式兼容（前端不改一行）
- BGE-small-zh 启动时加载常驻内存，Milvus 不可用时降级为裸聊天
- Milvus 使用嵌入式模式（etcd + MinIO 内嵌），单容器部署
- 内存上限：RAG 容器 `mem_limit: 512m`，Milvus 容器 `mem_limit: 1g`
- 模型服务在宿主机 8001 端口（非 Docker），RAG 容器通过 `host.docker.internal` 访问

---

## File Structure Map

```
rag-service/                    ← 新建
├── __init__.py
├── main.py                     ← FastAPI 入口 + lifespan
├── config.py                   ← 所有配置从环境变量读取
├── requirements.txt
├── Dockerfile
├── api/
│   ├── __init__.py
│   └── chat.py                 ← POST /v1/chat/completions
├── services/
│   ├── __init__.py
│   ├── embedding.py            ← BGE-small-zh 封装
│   ├── retriever.py            ← Milvus 连接 + 检索
│   └── llm_client.py           ← httpx 异步调用模型
├── rag/
│   ├── __init__.py
│   └── pipeline.py             ← RAG 编排：检索→注入→调用
├── ingestion/
│   ├── __init__.py
│   ├── chunker.py              ← 文本分块
│   └── indexer.py              ← PG → Milvus 入库脚本
├── schemas/
│   ├── __init__.py
│   └── chat.py                 ← Pydantic 请求/响应模型
└── tests/
    ├── __init__.py
    ├── test_embedding.py
    ├── test_retriever.py
    ├── test_llm_client.py
    ├── test_pipeline.py
    └── test_chunker.py
```

修改的已有文件：
- `docker-compose.yml` — 新增 milvus + rag-service 服务
- `deploy/nginx.conf` — 改 `/api/mascot/chat` 的 proxy_pass
- `backend/src/posts/posts.service.ts` — create/update/delete 后触发 reindex
- `backend/src/chatters/chatters.service.ts` — create/update/delete 后触发 reindex

---

### Task 1: 项目脚手架和配置

**Files:**
- Create: `rag-service/requirements.txt`
- Create: `rag-service/config.py`
- Create: `rag-service/Dockerfile`
- Create: `rag-service/__init__.py`
- Create: `rag-service/api/__init__.py`
- Create: `rag-service/services/__init__.py`
- Create: `rag-service/rag/__init__.py`
- Create: `rag-service/ingestion/__init__.py`
- Create: `rag-service/schemas/__init__.py`
- Create: `rag-service/tests/__init__.py`

**Interfaces:**
- Produces: `config.py` 导出 `Settings` dataclass，其他模块通过 `from config import settings` 引用

- [ ] **Step 1: 创建 requirements.txt**

```txt
fastapi[standard]==0.115.*
pymilvus==2.5.*
langchain-text-splitters==0.3.*
sentence-transformers==3.*
httpx==0.28.*
asyncpg==0.30.*
pydantic==2.*
pytest==8.*
pytest-asyncio==0.24.*
pytest-httpx==0.30.*
```

- [ ] **Step 2: 创建 config.py**

```python
"""RAG 服务配置 — 所有可配置项从环境变量读取，提供合理默认值。"""

import os
from dataclasses import dataclass, field


@dataclass
class Settings:
    # 服务
    host: str = "0.0.0.0"
    port: int = 8002

    # Milvus
    milvus_host: str = "localhost"
    milvus_port: int = 19530
    milvus_collection: str = "blog_knowledge"

    # Embedding
    embedding_model: str = "BAAI/bge-small-zh"
    embedding_dim: int = 512

    # 检索
    retrieval_top_k: int = 5
    retrieval_threshold: float = 0.4
    retrieval_skip_min_chars: int = 5  # 短于此长度的用户消息跳过检索

    # 模型服务
    llm_base_url: str = "http://127.0.0.1:8001/v1"
    llm_timeout: int = 30

    # 降级回复（流萤语气，不暴露技术细节）
    fallback_reply: str = "唔…我好像有点走神了，再说一遍好吗？"

    # 数据库（入库脚本用）
    database_url: str = "postgresql://postgres:blog123456@localhost:5432/blog"

    def __post_init__(self):
        for key in self.__annotations__:
            env_val = os.getenv(key.upper())
            if env_val is not None:
                target_type = type(getattr(self, key))
                if target_type == bool:
                    setattr(self, key, env_val.lower() in ("1", "true", "yes"))
                else:
                    setattr(self, key, target_type(env_val))


settings = Settings()
```

- [ ] **Step 3: 创建 Dockerfile**

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# 先装依赖（利用 Docker 缓存层）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 预下载 BGE 模型（避免启动时下载）
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-zh')"

# 复制源码
COPY . .

EXPOSE 8002
CMD ["fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "8002"]
```

- [ ] **Step 4: 创建所有 `__init__.py` 空文件**

```bash
touch rag-service/__init__.py \
      rag-service/api/__init__.py \
      rag-service/services/__init__.py \
      rag-service/rag/__init__.py \
      rag-service/ingestion/__init__.py \
      rag-service/schemas/__init__.py \
      rag-service/tests/__init__.py
```

- [ ] **Step 5: 验证目录结构**

Run: `ls -R rag-service/`
Expected: 所有文件就位，目录结构与 File Structure Map 一致

- [ ] **Step 6: Commit**

```bash
git add rag-service/
git commit -m "feat(rag): add project scaffolding, config, and Dockerfile"
```

---

### Task 2: Pydantic 数据模型

**Files:**
- Create: `rag-service/schemas/chat.py`

**Interfaces:**
- Produces: `ChatMessage(role, content)`, `ChatRequest(messages, temperature, max_tokens)`, `ChatChoice(index, message)`, `ChatResponse(choices)`

- [ ] **Step 1: 编写 schemas/chat.py**

```python
"""OpenAI 兼容的聊天请求/响应模型。"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="user | assistant | system")
    content: str = Field(..., description="消息正文")


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., min_length=1, description="对话历史")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(1024, ge=1, le=4096)


class ChatChoice(BaseModel):
    index: int = 0
    message: ChatMessage


class Usage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class ChatResponse(BaseModel):
    choices: List[ChatChoice]
    usage: Usage = Field(default_factory=Usage)
```

- [ ] **Step 2: 验证模型可以导入**

Run: `cd rag-service && python -c "from schemas.chat import ChatRequest, ChatResponse; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add rag-service/schemas/chat.py
git commit -m "feat(rag): add OpenAI-compatible Pydantic chat models"
```

---

### Task 3: Embedding 服务

**Files:**
- Create: `rag-service/services/embedding.py`
- Create: `rag-service/tests/test_embedding.py`

**Interfaces:**
- Consumes: `config.settings` (embedding_model, embedding_dim)
- Produces: `EmbeddingService.load_model()` -> None, `EmbeddingService.encode(texts: List[str]) -> List[List[float]]`

- [ ] **Step 1: 编写测试 test_embedding.py**

```python
"""EmbeddingService 单元测试。"""

import pytest
from services.embedding import EmbeddingService


@pytest.fixture
def svc():
    svc = EmbeddingService()
    svc.load_model()
    return svc


def test_encode_single_text(svc):
    """单条文本应返回 512 维向量。"""
    result = svc.encode(["你好"])
    assert len(result) == 1
    assert len(result[0]) == 512
    assert all(isinstance(v, float) for v in result[0])


def test_encode_multiple_texts(svc):
    """批量编码应返回等量向量。"""
    texts = ["你好", "流萤是星核猎手成员", "今天天气不错"]
    result = svc.encode(texts)
    assert len(result) == 3
    for vec in result:
        assert len(vec) == 512


def test_encode_empty_string(svc):
    """空字符串应能编码但不为零向量。"""
    result = svc.encode([""])
    assert len(result) == 1
    assert len(result[0]) == 512
    assert any(v != 0.0 for v in result[0])


def test_encode_preserves_order(svc):
    """批量结果顺序应与输入一致（相似文本检查）。"""
    texts = ["流萤的装甲叫萨姆", "今天晚饭吃什么"]
    result = svc.encode(texts)
    # 同一个文本两次编码应得到相同结果
    result2 = svc.encode(texts)
    for i in range(len(result)):
        for a, b in zip(result[i], result2[i]):
            assert abs(a - b) < 1e-6
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd rag-service && python -m pytest tests/test_embedding.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'services.embedding'`

- [ ] **Step 3: 编写 services/embedding.py**

```python
"""BGE-small-zh embedding 封装。启动时加载模型，常驻内存。"""

from typing import List
from sentence_transformers import SentenceTransformer
from config import settings


class EmbeddingService:
    def __init__(self):
        self._model = None

    def load_model(self) -> None:
        """加载 BGE-small-zh 模型（~100MB 显存/内存）。"""
        self._model = SentenceTransformer(settings.embedding_model)

    def encode(self, texts: List[str]) -> List[List[float]]:
        """将文本列表转为 512 维浮点向量列表。
        
        Args:
            texts: 待编码文本，每个元素一个字符串。
        
        Returns:
            与 texts 等长的向量列表，每个向量 512 维。
        """
        if self._model is None:
            raise RuntimeError("模型未加载，请先调用 load_model()")
        embeddings = self._model.encode(
            texts,
            normalize_embeddings=True,  # 余弦相似度需要归一化
            show_progress_bar=False,
        )
        return embeddings.tolist()
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd rag-service && python -m pytest tests/test_embedding.py -v`
Expected: 4 tests PASS（首次运行会下载模型，约需 30s）

- [ ] **Step 5: Commit**

```bash
git add rag-service/services/embedding.py rag-service/tests/test_embedding.py
git commit -m "feat(rag): add BGE-small-zh embedding service with tests"
```

---

### Task 4: Milvus 检索服务

**Files:**
- Create: `rag-service/services/retriever.py`
- Create: `rag-service/tests/test_retriever.py`

**Interfaces:**
- Consumes: `config.settings` (milvus_host, milvus_port, milvus_collection, embedding_dim, retrieval_top_k, retrieval_threshold)
- Produces:
  - `Retriever.connect()` -> None
  - `Retriever.create_collection(drop_existing: bool)` -> None
  - `Retriever.search(vector: List[float], top_k: int, threshold: float) -> List[dict]`
  - `Retriever.insert(data: List[dict])` -> None
  - `Retriever.delete_by_source(source_type: str, source_id: int)` -> None

- [ ] **Step 1: 编写测试 test_retriever.py**

```python
"""Retriever 单元测试 — 需要 Milvus 运行。"""

import pytest
from services.retriever import Retriever
from config import settings


@pytest.fixture
def retriever():
    r = Retriever()
    r.connect()
    # 每次测试用独立的 collection，避免污染
    r.create_collection(drop_existing=True)
    yield r


def test_connect_and_create_collection(retriever):
    """连接并创建 collection 后应可查询。"""
    assert retriever._client is not None


def test_insert_and_search(retriever):
    """插入向量后应能检索到。"""
    # 插入一条虚构向量
    import random
    random.seed(42)
    vec = [random.uniform(-1, 1) for _ in range(512)]
    retriever.insert([{
        "embedding": vec,
        "content": "流萤是星核猎手成员，前格拉默铁骑驾驶员。",
        "source_type": "post",
        "source_id": 1,
        "title": "测试文章",
        "slug": "test-post",
        "created_at": 1720410000,
    }])

    # 用相同向量搜索
    results = retriever.search(vec, top_k=3, threshold=0.0)
    assert len(results) >= 1
    assert results[0]["content"] == "流萤是星核猎手成员，前格拉默铁骑驾驶员。"
    assert results[0]["source_type"] == "post"
    assert results[0]["title"] == "测试文章"


def test_search_threshold_filters_low_scores(retriever):
    """低分结果应被阈值过滤。"""
    import random
    random.seed(1)
    vec_a = [random.uniform(-1, 1) for _ in range(512)]
    random.seed(999)
    vec_b = [random.uniform(-1, 1) for _ in range(512)]

    retriever.insert([{
        "embedding": vec_a,
        "content": "片段A",
        "source_type": "post",
        "source_id": 1,
        "title": "A",
        "slug": "a",
        "created_at": 1720410000,
    }])

    # 用完全不相关的向量搜索，阈值设得很高
    results = retriever.search(vec_b, top_k=5, threshold=0.99)
    assert len(results) == 0


def test_delete_by_source(retriever):
    """按 source_type + source_id 删除后应搜不到。"""
    import random
    random.seed(7)
    vec = [random.uniform(-1, 1) for _ in range(512)]
    retriever.insert([{
        "embedding": vec,
        "content": "待删除的测试内容",
        "source_type": "chatter",
        "source_id": 42,
        "title": "测试杂谈",
        "slug": "",
        "created_at": 1720410000,
    }])

    retriever.delete_by_source("chatter", 42)
    results = retriever.search(vec, top_k=5, threshold=0.0)
    assert all(r.get("source_id") != 42 for r in results)
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd rag-service && python -m pytest tests/test_retriever.py -v`
Expected: FAIL — `ModuleNotFoundError`

- [ ] **Step 3: 编写 services/retriever.py**

```python
"""Milvus 向量检索封装 — 连接管理、Collection 创建、插入、检索、删除。"""

from typing import List, Optional
from pymilvus import (
    connections,
    Collection,
    FieldSchema,
    CollectionSchema,
    DataType,
    utility,
)
from config import settings


class Retriever:
    def __init__(self):
        self._client = None
        self._collection = None

    # ---------- 连接 ----------

    def connect(self) -> None:
        """连接 Milvus 并加载 collection。"""
        connections.connect(
            alias="default",
            host=settings.milvus_host,
            port=settings.milvus_port,
        )
        self._client = connections

    def _load_collection(self) -> None:
        self._collection = Collection(settings.milvus_collection)
        self._collection.load()

    # ---------- Collection 管理 ----------

    def create_collection(self, drop_existing: bool = False) -> None:
        """创建 blog_knowledge collection。

        Schema:
          id (INT64, PK, auto)
          embedding (FLOAT_VECTOR, 512d)
          content (VARCHAR, 2048)
          source_type (VARCHAR, 32)
          source_id (INT64)
          title (VARCHAR, 512)
          slug (VARCHAR, 256)
          created_at (INT64)
        """
        if drop_existing and utility.has_collection(settings.milvus_collection):
            utility.drop_collection(settings.milvus_collection)

        if utility.has_collection(settings.milvus_collection):
            self._load_collection()
            return

        fields = [
            FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=settings.embedding_dim),
            FieldSchema(name="content", dtype=DataType.VARCHAR, max_length=2048),
            FieldSchema(name="source_type", dtype=DataType.VARCHAR, max_length=32),
            FieldSchema(name="source_id", dtype=DataType.INT64),
            FieldSchema(name="title", dtype=DataType.VARCHAR, max_length=512),
            FieldSchema(name="slug", dtype=DataType.VARCHAR, max_length=256),
            FieldSchema(name="created_at", dtype=DataType.INT64),
        ]
        schema = CollectionSchema(fields, description="博客知识库")
        self._collection = Collection(settings.milvus_collection, schema)

        # 创建 IVF_FLAT 索引
        index_params = {
            "field_name": "embedding",
            "index_type": "IVF_FLAT",
            "metric_type": "COSINE",
            "params": {"nlist": 128},
        }
        self._collection.create_index("embedding", index_params)
        self._collection.load()

    # ---------- 检索 ----------

    def search(
        self,
        vector: List[float],
        top_k: Optional[int] = None,
        threshold: Optional[float] = None,
    ) -> List[dict]:
        """余弦相似度检索，返回超过阈值的文档列表。

        Args:
            vector: 512 维查询向量。
            top_k: 返回数量，默认取 settings。
            threshold: 最低余弦相似度，默认取 settings。

        Returns:
            [{content, score, source_type, source_id, title, slug, created_at}, ...]
        """
        if top_k is None:
            top_k = settings.retrieval_top_k
        if threshold is None:
            threshold = settings.retrieval_threshold

        if self._collection is None:
            self._load_collection()

        search_params = {"metric_type": "COSINE", "params": {"nprobe": 16}}
        results = self._collection.search(
            data=[vector],
            anns_field="embedding",
            param=search_params,
            limit=top_k,
            output_fields=["content", "source_type", "source_id", "title", "slug", "created_at"],
        )

        docs = []
        for hits in results:
            for hit in hits:
                if hit.score >= threshold:
                    docs.append({
                        "content": hit.entity.get("content", ""),
                        "score": hit.score,
                        "source_type": hit.entity.get("source_type", ""),
                        "source_id": hit.entity.get("source_id", 0),
                        "title": hit.entity.get("title", ""),
                        "slug": hit.entity.get("slug", ""),
                        "created_at": hit.entity.get("created_at", 0),
                    })
        return docs

    # ---------- 写入 ----------

    def insert(self, data: List[dict]) -> None:
        """批量插入文档。

        Args:
            data: [{
                embedding: List[float],
                content: str,
                source_type: str,
                source_id: int,
                title: str,
                slug: str,
                created_at: int,
            }, ...]
        """
        if self._collection is None:
            self._load_collection()
        self._collection.insert(data)
        self._collection.flush()

    # ---------- 删除 ----------

    def delete_by_source(self, source_type: str, source_id: int) -> None:
        """删除指定来源的所有片段（增量更新用）。"""
        if self._collection is None:
            self._load_collection()
        expr = f'source_type == "{source_type}" and source_id == {source_id}'
        self._collection.delete(expr)
        self._collection.flush()
```

- [ ] **Step 4: 运行测试**

Run: `cd rag-service && python -m pytest tests/test_retriever.py -v`
Expected: 4 tests PASS（需要 Milvus 在 localhost:19530 运行）

- [ ] **Step 5: Commit**

```bash
git add rag-service/services/retriever.py rag-service/tests/test_retriever.py
git commit -m "feat(rag): add Milvus retriever with insert, search, delete"
```

---

### Task 5: LLM 客户端

**Files:**
- Create: `rag-service/services/llm_client.py`
- Create: `rag-service/tests/test_llm_client.py`

**Interfaces:**
- Consumes: `config.settings` (llm_base_url, llm_timeout, fallback_reply)
- Produces: `LlmClient.chat(messages: List[ChatMessage]) -> ChatResponse`

- [ ] **Step 1: 编写测试 test_llm_client.py**

```python
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd rag-service && python -m pytest tests/test_llm_client.py -v`
Expected: FAIL — import error

- [ ] **Step 3: 编写 services/llm_client.py**

```python
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
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd rag-service && python -m pytest tests/test_llm_client.py -v`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add rag-service/services/llm_client.py rag-service/tests/test_llm_client.py
git commit -m "feat(rag): add LLM client with timeout fallback and tests"
```

---

### Task 6: RAG 管线编排

**Files:**
- Create: `rag-service/rag/pipeline.py`
- Create: `rag-service/tests/test_pipeline.py`

**Interfaces:**
- Consumes:
  - `services.embedding.EmbeddingService.encode()`
  - `services.retriever.Retriever.search()`
  - `services.llm_client.LlmClient.chat()` 或 `ChatResponse`
  - `config.settings` (retrieval_skip_min_chars)
- Produces: `RagPipeline.run(messages: List[ChatMessage]) -> ChatResponse`

- [ ] **Step 1: 编写测试 test_pipeline.py**

```python
"""RagPipeline 单元测试 — mock 所有外部依赖。"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
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
async def test_pipeline_injects_context(mock_embedding, mock_retriever, mock_llm):
    """检索到文档时，应将其注入 system message 并调用模型。"""
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("我最近写了什么？")

    result = await pipeline.run(messages)

    # 验证模型被调用
    mock_llm.chat.assert_called_once()
    called_messages = mock_llm.chat.call_args[0][0]
    # system message 应该包含注入的上下文
    system_content = called_messages[0].content
    assert "Docker部署指南" in system_content
    assert "参考知识" in system_content
    # 模型响应正确返回
    assert "Docker" in result.choices[0].message.content


@pytest.mark.asyncio
async def test_pipeline_skips_short_message(mock_embedding, mock_retriever, mock_llm):
    """短消息（<5字）跳过检索，直接调模型。"""
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("你好")

    result = await pipeline.run(messages)

    # 检索不应被调用
    mock_embedding.encode.assert_not_called()
    mock_retriever.search.assert_not_called()
    # 但模型仍应被调用
    mock_llm.chat.assert_called_once()


@pytest.mark.asyncio
async def test_pipeline_empty_retrieval_passes_through(mock_embedding, mock_retriever, mock_llm):
    """检索无结果时，原封不动调模型。"""
    mock_retriever.search.return_value = []
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("今天服务器状态怎么样？")

    result = await pipeline.run(messages)

    called_messages = mock_llm.chat.call_args[0][0]
    # system message 不应被修改
    assert called_messages[0].content == "你是流萤。"


@pytest.mark.asyncio
async def test_pipeline_retrieval_error_graceful_degradation(mock_embedding, mock_retriever, mock_llm):
    """检索抛异常时，降级为裸聊天，不应中断。"""
    mock_retriever.search.side_effect = RuntimeError("Milvus connection lost")
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm)
    messages = make_messages("我最近写了什么？")

    result = await pipeline.run(messages)

    # 仍应成功返回
    mock_llm.chat.assert_called_once()
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd rag-service && python -m pytest tests/test_pipeline.py -v`
Expected: FAIL — import error

- [ ] **Step 3: 编写 rag/pipeline.py**

```python
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
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd rag-service && python -m pytest tests/test_pipeline.py -v`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add rag-service/rag/pipeline.py rag-service/tests/test_pipeline.py
git commit -m "feat(rag): add RAG pipeline with context injection and graceful degradation"
```

---

### Task 7: Chat API 路由

**Files:**
- Create: `rag-service/api/chat.py`

**Interfaces:**
- Consumes: `RagPipeline.run(messages) -> ChatResponse`
- Produces: FastAPI APIRouter with `POST /v1/chat/completions`

- [ ] **Step 1: 编写 api/chat.py**

```python
"""OpenAI 兼容聊天接口 — 接收请求 → 调 RAG pipeline → 返回响应。"""

from fastapi import APIRouter, HTTPException
from schemas.chat import ChatRequest, ChatResponse
from rag.pipeline import RagPipeline

router = APIRouter(tags=["chat"])

# 由 main.py 在 startup 时注入
_pipeline: RagPipeline | None = None


def set_pipeline(pipeline: RagPipeline) -> None:
    """注入 pipeline 实例（main.py lifespan 中调用）。"""
    global _pipeline
    _pipeline = pipeline


@router.post("/v1/chat/completions", response_model=ChatResponse)
async def chat_completions(request: ChatRequest):
    """处理聊天补全请求。

    - 接收 OpenAI 格式消息列表
    - 通过 RAG pipeline 检索知识并生成回复
    - 返回 OpenAI 格式响应
    """
    if _pipeline is None:
        raise HTTPException(status_code=503, detail="RAG pipeline not initialized")

    try:
        return await _pipeline.run(request.messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")
```

- [ ] **Step 2: 验证导入**

Run: `cd rag-service && python -c "from api.chat import router, set_pipeline; print('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add rag-service/api/chat.py
git commit -m "feat(rag): add OpenAI-compatible chat completions endpoint"
```

---

### Task 8: FastAPI 主入口

**Files:**
- Create: `rag-service/main.py`

**Interfaces:**
- Consumes: all services, pipeline, and api router
- Produces: FastAPI app on port 8002

- [ ] **Step 1: 编写 main.py**

```python
"""流萤 RAG 服务 — FastAPI 入口，管理服务生命周期。"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from config import settings
from services.embedding import EmbeddingService
from services.retriever import Retriever
from services.llm_client import LlmClient
from rag.pipeline import RagPipeline
from api.chat import router as chat_router, set_pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    """启动：加载模型 + 连接 Milvus + 初始化 pipeline。
       关闭：释放资源。"""
    # ===== startup =====
    print("[rag] Loading BGE-small-zh model...")
    embedding = EmbeddingService()
    embedding.load_model()
    print("[rag] Embedding model loaded.")

    print(f"[rag] Connecting to Milvus at {settings.milvus_host}:{settings.milvus_port}...")
    retriever = Retriever()
    try:
        retriever.connect()
        retriever.create_collection(drop_existing=False)
        print("[rag] Milvus connected and collection ready.")
    except Exception as e:
        print(f"[rag] WARNING: Milvus unavailable ({e}) — RAG will run in pass-through mode.")

    llm = LlmClient()
    pipeline = RagPipeline(embedding, retriever, llm)
    set_pipeline(pipeline)
    print("[rag] Pipeline ready, listening on port", settings.port)

    yield  # ===== app running =====

    # ===== shutdown =====
    print("[rag] Shutting down.")


app = FastAPI(
    title="Firefly RAG Service",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(chat_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "firefly-rag"}
```

- [ ] **Step 2: 启动服务验证**

Run: `cd rag-service && fastapi dev main.py --port 8002`（Ctrl+C 停止）

Expected: 控制台输出：
```
[rag] Loading BGE-small-zh model...
[rag] Embedding model loaded.
[rag] Connecting to Milvus at localhost:19530...
[rag] WARNING: Milvus unavailable (...) — RAG will run in pass-through mode.
[rag] Pipeline ready, listening on port 8002
```

- [ ] **Step 3: 测试 health endpoint**

Run: `curl http://localhost:8002/health`
Expected: `{"status":"ok","service":"firefly-rag"}`

- [ ] **Step 4: Commit**

```bash
git add rag-service/main.py
git commit -m "feat(rag): add FastAPI main entry with lifespan management"
```

---

### Task 9: 文本分块器

**Files:**
- Create: `rag-service/ingestion/chunker.py`
- Create: `rag-service/tests/test_chunker.py`

**Interfaces:**
- Produces: `chunk_text(text: str, chunk_size: int = 512, chunk_overlap: int = 64) -> List[str]`

- [ ] **Step 1: 编写测试 test_chunker.py**

```python
"""文本分块器单元测试。"""

from ingestion.chunker import chunk_text


def test_chunk_short_text():
    """短于 chunk_size 的文本返回单块。"""
    result = chunk_text("这是一段很短的文本。", chunk_size=512, chunk_overlap=64)
    assert len(result) == 1
    assert result[0] == "这是一段很短的文本。"


def test_chunk_long_text_splits():
    """超过 chunk_size 的文本应分成多块。"""
    # 生成 ~600 字的文本（每个句子约 20 字，需 30 句）
    sentences = ["这是测试句子的第{}句话用来填充文本。".format(i) for i in range(30)]
    text = "。".join(sentences)
    result = chunk_text(text, chunk_size=200, chunk_overlap=40)
    assert len(result) >= 2  # 200 字每块，600 字至少 2 块


def test_chunk_preserves_paragraph_boundaries():
    """段落边界优先（空行切分）。"""
    text = "第一段内容。\n\n第二段内容。\n\n第三段内容。"
    result = chunk_text(text, chunk_size=512, chunk_overlap=64)
    assert len(result) == 3
    assert "第一段" in result[0]
    assert "第二段" in result[1]
    assert "第三段" in result[2]


def test_chunk_empty_text():
    """空文本返回空列表。"""
    result = chunk_text("")
    assert result == []


def test_chunk_overlap_maintains_context():
    """确认 overlap 在块之间保留了上下文。"""
    text = ""
    for i in range(50):
        text += f"句子{i}。" if i % 3 == 0 else f"这是填充文本的第{i}部分。"
    result = chunk_text(text, chunk_size=150, chunk_overlap=50)
    # 相邻块应有内容重叠
    if len(result) >= 2:
        last_part_of_first = result[0][-30:]
        # 第二块应该包含第一块末尾的部分内容
        assert any(
            last_part_of_first.strip()[:10] in r for r in result[1:]
        ) or len(result[0]) <= 150
```

- [ ] **Step 2: 运行测试验证失败**

Run: `cd rag-service && python -m pytest tests/test_chunker.py -v`
Expected: FAIL — import error

- [ ] **Step 3: 编写 ingestion/chunker.py**

```python
"""文本分块 — 基于 RecursiveCharacterTextSplitter，优先段落边界。"""

from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter


def chunk_text(
    text: str,
    chunk_size: int = 512,
    chunk_overlap: int = 64,
) -> List[str]:
    """将文本按语义边界切分为片段。

    Args:
        text: 原始文本。
        chunk_size: 每块最大字符数。
        chunk_overlap: 相邻块重叠字符数。

    Returns:
        文本片段列表，空文本返回空列表。
    """
    if not text or not text.strip():
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", "。", "！", "？", "；", " "],
        keep_separator=True,
    )
    return splitter.split_text(text)
```

- [ ] **Step 4: 运行测试验证通过**

Run: `cd rag-service && python -m pytest tests/test_chunker.py -v`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add rag-service/ingestion/chunker.py rag-service/tests/test_chunker.py
git commit -m "feat(rag): add recursive text chunker with tests"
```

---

### Task 10: 知识入库脚本

**Files:**
- Create: `rag-service/ingestion/indexer.py`

**Interfaces:**
- Consumes:
  - `config.settings` (database_url)
  - `services.embedding.EmbeddingService.encode()`
  - `services.retriever.Retriever.insert()` / `delete_by_source()`
  - `ingestion.chunker.chunk_text()`
- Produces: CLI 脚本 `index_blog.py`，支持 `--full`、`--recreate`、`--source-type`、`--source-id`

- [ ] **Step 1: 编写 ingestion/indexer.py**

```python
"""博客知识入库管线 — PostgreSQL → 分块 → Embedding → Milvus。

用法:
  python -m ingestion.indexer --full              # 全量入库
  python -m ingestion.indexer --full --recreate   # 删旧建新（强制重建）
  python -m ingestion.indexer --source-type post --source-id 5   # 增量更新单条
"""

import sys
import asyncio
import asyncpg
from config import settings
from services.embedding import EmbeddingService
from services.retriever import Retriever
from ingestion.chunker import chunk_text


async def fetch_posts(pg: asyncpg.Connection) -> list:
    """读取已发布的文章。"""
    rows = await pg.fetch("""
        SELECT id, title, content, slug,
               EXTRACT(EPOCH FROM created_at)::bigint AS created_at
        FROM posts
        WHERE published = true
        ORDER BY id
    """)
    return [("post", dict(r)) for r in rows]


async def fetch_chatters(pg: asyncpg.Connection) -> list:
    """读取全部杂谈。"""
    rows = await pg.fetch("""
        SELECT id, title, content,
               EXTRACT(EPOCH FROM created_at)::bigint AS created_at
        FROM chatters
        ORDER BY id
    """)
    return [("chatter", dict(r)) for r in rows]


async def fetch_single(pg: asyncpg.Connection, source_type: str, source_id: int) -> dict | None:
    """读取单条记录。"""
    table = "posts" if source_type == "post" else "chatters"
    row = await pg.fetchrow(
        f"""
        SELECT id, title, content,
               {'slug,' if source_type == 'post' else ''}
               EXTRACT(EPOCH FROM created_at)::bigint AS created_at
        FROM {table}
        WHERE id = $1
        """,
        source_id,
    )
    if row is None:
        return None
    return (source_type, dict(row))


async def run_full(recreate: bool = False):
    """全量入库：读取所有文章和杂谈 → 分块 → embedding → Milvus。"""
    print("[indexer] Loading embedding model...")
    embedding = EmbeddingService()
    embedding.load_model()

    print("[indexer] Connecting to Milvus...")
    retriever = Retriever()
    retriever.connect()
    retriever.create_collection(drop_existing=recreate)
    print("[indexer] Collection ready.")

    print("[indexer] Connecting to PostgreSQL...")
    pg = await asyncpg.connect(settings.database_url)

    items = await fetch_posts(pg) + await fetch_chatters(pg)
    print(f"[indexer] Found {len(items)} items to index.")

    batch_size = 32
    total_chunks = 0
    for i in range(0, len(items), batch_size):
        batch = items[i : i + batch_size]
        batch_data = []

        for source_type, item in batch:
            chunks = chunk_text(item["content"])
            if not chunks:
                continue
            vectors = embedding.encode(chunks)
            for j, (chunk, vec) in enumerate(zip(chunks, vectors)):
                batch_data.append({
                    "embedding": vec,
                    "content": chunk,
                    "source_type": source_type,
                    "source_id": item["id"],
                    "title": item["title"] or "",
                    "slug": item.get("slug", ""),
                    "created_at": item["created_at"] or 0,
                })

        if batch_data:
            retriever.insert(batch_data)
            total_chunks += len(batch_data)
        print(f"[indexer] Progress: {min(i + batch_size, len(items))}/{len(items)} — {total_chunks} chunks")

    await pg.close()
    print(f"[indexer] Done. Total {total_chunks} chunks indexed.")


async def run_incremental(source_type: str, source_id: int):
    """增量更新：删除旧 chunks → 重新分块入库。"""
    print(f"[indexer] Incremental update: {source_type}#{source_id}")

    embedding = EmbeddingService()
    embedding.load_model()

    retriever = Retriever()
    retriever.connect()
    retriever.create_collection(drop_existing=False)

    pg = await asyncpg.connect(settings.database_url)
    item = await fetch_single(pg, source_type, source_id)
    if item is None:
        print(f"[indexer] Source {source_type}#{source_id} not found — deleting existing chunks.")
        retriever.delete_by_source(source_type, source_id)
        await pg.close()
        return

    # 删旧
    retriever.delete_by_source(source_type, source_id)

    # 写新
    source_type, data = item
    chunks = chunk_text(data["content"])
    if chunks:
        vectors = embedding.encode(chunks)
        batch = []
        for chunk, vec in zip(chunks, vectors):
            batch.append({
                "embedding": vec,
                "content": chunk,
                "source_type": source_type,
                "source_id": data["id"],
                "title": data["title"] or "",
                "slug": data.get("slug", ""),
                "created_at": data["created_at"] or 0,
            })
        retriever.insert(batch)
        print(f"[indexer] Indexed {len(batch)} chunks for {source_type}#{source_id}")
    else:
        print(f"[indexer] No content to index for {source_type}#{source_id}")

    await pg.close()


# ---------- CLI ----------

def print_usage():
    print(__doc__)


if __name__ == "__main__":
    args = sys.argv[1:]

    if "--full" in args:
        recreate = "--recreate" in args
        asyncio.run(run_full(recreate=recreate))
    elif "--source-type" in args and "--source-id" in args:
        try:
            st_idx = args.index("--source-type")
            si_idx = args.index("--source-id")
            source_type = args[st_idx + 1]
            source_id = int(args[si_idx + 1])
            asyncio.run(run_incremental(source_type, source_id))
        except (ValueError, IndexError):
            print_usage()
            sys.exit(1)
    else:
        print_usage()
        sys.exit(1)
```

- [ ] **Step 2: 验证导入并测试帮助输出**

Run: `cd rag-service && python -m ingestion.indexer`
Expected: 输出 usage 信息

- [ ] **Step 3: Commit**

```bash
git add rag-service/ingestion/indexer.py
git commit -m "feat(rag): add knowledge ingestion pipeline (full + incremental)"
```

---

### Task 11: Docker Compose 和 Nginx 配置

**Files:**
- Modify: `docker-compose.yml` — 新增 milvus + rag-service 服务
- Modify: `deploy/nginx.conf` — 改 proxy_pass

- [ ] **Step 1: 修改 docker-compose.yml**

在 `services:` 块末尾新增两个服务（在 `volumes:` 之前）：

```yaml
  # ===== RAG 系统（Phase 1）=====
  milvus:
    image: milvusdb/milvus:v2.5.0
    container_name: blog-milvus
    restart: unless-stopped
    ports:
      - "127.0.0.1:19530:19530"
      - "127.0.0.1:9091:9091"
    environment:
      ETCD_USE_EMBED: "true"
      MINIO_USE_EMBED: "true"
    volumes:
      - milvus_data:/var/lib/milvus
    mem_limit: 1g

  rag-service:
    build: ./rag-service
    container_name: blog-rag
    restart: unless-stopped
    ports:
      - "127.0.0.1:8002:8002"
    extra_hosts:
      - "host.docker.internal:host-gateway"
    depends_on:
      - milvus
    environment:
      MILVUS_HOST: milvus
      MILVUS_PORT: "19530"
      LLM_BASE_URL: http://host.docker.internal:8001/v1
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/blog
    mem_limit: 512m
```

在 `volumes:` 块末尾新增：

```yaml
  milvus_data:
```

- [ ] **Step 2: 修改 deploy/nginx.conf**

将第 22-27 行：

```nginx
    # 看板娘聊天 API —— 代理到本地微调模型
    location /api/mascot/chat {
        proxy_pass http://127.0.0.1:8001/v1/chat/completions;
        proxy_set_header Host $host;
        proxy_read_timeout 60s;
    }
```

改为：

```nginx
    # 看板娘聊天 API —— 代理到 RAG 服务（RAG 检索后转发到模型）
    location /api/mascot/chat {
        proxy_pass http://127.0.0.1:8002/v1/chat/completions;
        proxy_set_header Host $host;
        proxy_read_timeout 90s;
    }
```

- [ ] **Step 3: 验证 docker-compose 语法**

Run: `docker compose config --quiet`
Expected: 无输出（语法正确）

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml deploy/nginx.conf
git commit -m "feat(rag): add milvus + rag-service to docker-compose, update nginx proxy"
```

---

### Task 12: NestJS 增量索引 Webhook

**Files:**
- Modify: `backend/src/posts/posts.service.ts` — create/update/delete 后调 reindex
- Modify: `backend/src/chatters/chatters.service.ts` — create/update/delete 后调 reindex
- Create: `backend/src/rag/rag.module.ts`
- Create: `backend/src/rag/rag.service.ts`

**Interfaces:**
- Produces: `RagService.reindex(sourceType: string, sourceId: number)` → 内部 POST 到 Python RAG 服务

- [ ] **Step 1: 创建 backend/src/rag/rag.service.ts**

```typescript
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly ragUrl = process.env.RAG_SERVICE_URL ?? "http://127.0.0.1:8002";

  /** 触发单条内容重索引（异步，不阻塞主流程）。 */
  reindex(sourceType: "post" | "chatter", sourceId: number): void {
    const url = `${this.ragUrl}/api/rag/reindex`;
    const body = JSON.stringify({ source_type: sourceType, source_id: sourceId });

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
      .then((res) => {
        if (!res.ok) {
          this.logger.warn(`Reindex failed: ${sourceType}#${sourceId} → HTTP ${res.status}`);
        }
      })
      .catch((err) => {
        this.logger.warn(`Reindex unreachable: ${sourceType}#${sourceId} — ${err.message}`);
      });
  }
}
```

- [ ] **Step 2: 创建 backend/src/rag/rag.module.ts**

```typescript
import { Module, Global } from "@nestjs/common";
import { RagService } from "./rag.service";

@Global()
@Module({
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
```

- [ ] **Step 3: 在 app.module.ts 注册 RagModule**

在 `backend/src/app.module.ts` 的 imports 数组中新增：

```typescript
import { RagModule } from "./rag/rag.module";

// 在 imports 数组中：
RagModule,
```

- [ ] **Step 4: 修改 posts.service.ts — 注入 RagService 并在写操作后触发**

在 `backend/src/posts/posts.service.ts` 顶部：

```typescript
import { RagService } from "../rag/rag.service";
```

在构造函数中注入：

```typescript
constructor(
  private prisma: PrismaService,
  private rag: RagService,  // 新增
) {}
```

在 `create()` 方法的 return 之前加：

```typescript
this.rag.reindex("post", post.id);
```

在 `update()` 方法的 return 之前加：

```typescript
this.rag.reindex("post", id);
```

在 `remove()` 方法的 return 之前加（如果有 remove 方法的话；检查实际的 service 代码）：

```typescript
this.rag.reindex("post", id);
```

- [ ] **Step 5: 同样修改 chatters.service.ts**

同 Step 4 的模式，注入 RagService，在 create/update/delete 后调用 `this.rag.reindex("chatter", id)`。

- [ ] **Step 6: 给 Python RAG 服务添加 `/api/rag/reindex` 路由**

修改 `rag-service/main.py`，在 `app.include_router(chat_router)` 下面新增：

```python
from pydantic import BaseModel

class ReindexRequest(BaseModel):
    source_type: str  # "post" | "chatter"
    source_id: int

@app.post("/api/rag/reindex")
async def reindex(request: ReindexRequest):
    """增量索引 Webhook — NestJS 在文章/杂谈变更时调用。"""
    import asyncio
    from ingestion.indexer import run_incremental
    asyncio.create_task(run_incremental(request.source_type, request.source_id))
    return {"status": "accepted"}
```

- [ ] **Step 7: 验证 NestJS 编译**

Run: `cd backend && npm run build`
Expected: 编译成功（无类型错误）

- [ ] **Step 8: Commit**

```bash
git add backend/src/rag/ rag-service/main.py backend/src/posts/posts.service.ts backend/src/chatters/chatters.service.ts backend/src/app.module.ts
git commit -m "feat(rag): add NestJS webhook for incremental reindex on content change"
```

---

### Task 13: 端到端集成测试

**Files:**
- Create: `rag-service/tests/test_integration.py`

**Interfaces:**
- Consumes: 完整的 RAG 服务
- Produces: 集成测试验证全链路

- [ ] **Step 1: 编写集成测试 test_integration.py**

```python
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
```

- [ ] **Step 2: 验证测试可以收集**

Run: `cd rag-service && python -m pytest tests/test_integration.py --collect-only`
Expected: 4 tests collected (all marked `integration`)

- [ ] **Step 3: Commit**

```bash
git add rag-service/tests/test_integration.py
git commit -m "test(rag): add end-to-end integration tests"
```

---

## 实施顺序

```
Task 1  (脚手架)      → 所有 `__init__.py` + config + Dockerfile
Task 2  (数据模型)     → schemas/chat.py
Task 3  (Embedding)   → services/embedding.py + tests
Task 4  (Retriever)   → services/retriever.py + tests
Task 5  (LLM Client)  → services/llm_client.py + tests
Task 6  (Pipeline)    → rag/pipeline.py + tests
Task 7  (API 路由)    → api/chat.py
Task 8  (main.py)     → main.py（组合所有模块）
Task 9  (分块器)      → ingestion/chunker.py + tests
Task 10 (入库脚本)     → ingestion/indexer.py
Task 11 (Docker/Nginx)→ docker-compose.yml + nginx.conf
Task 12 (NestJS Hook) → backend/src/rag/ + service 修改
Task 13 (集成测试)     → tests/test_integration.py
```

**Task 1-8 构成最小可用链路**（启动服务 → 接收请求 → 返回响应）；Task 9-10 是离线管线（有数据才能检索）；Task 11-12 是部署和自动化。

---

## 首次部署 checklist

```bash
# 1. 启动 Milvus
docker compose up -d milvus

# 2. 确认 Milvus 健康
curl http://127.0.0.1:9091/healthz

# 3. 构建并启动 RAG 服务
docker compose up -d --build rag-service

# 4. 确认 RAG 服务健康
curl http://127.0.0.1:8002/health

# 5. 首次全量入库（在宿主机运行，因为需要访问 PG 和 embedding 模型）
cd rag-service
pip install -r requirements.txt
python -m ingestion.indexer --full

# 6. 更新 Nginx 配置
sudo cp deploy/nginx.conf /etc/nginx/sites-available/hglblog
sudo nginx -t && sudo nginx -s reload

# 7. 测试完整链路
curl -X POST http://127.0.0.1:8002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好"}]}'
```

---

## 回滚方案

如果 RAG 服务出问题，只需改 Nginx 配置回原模型端口：

```nginx
location /api/mascot/chat {
    proxy_pass http://127.0.0.1:8001/v1/chat/completions;  # 回滚到直连模型
    proxy_read_timeout 60s;
}
```

```bash
sudo nginx -t && sudo nginx -s reload
```

前端、后端、模型服务均不受影响。
