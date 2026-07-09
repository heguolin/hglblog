# 流萤双模型 RAG 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 RAG 管道从单模型切换为双模型路由——日常聊天用微调角色模型(:8001)，博客知识问答用基座模型(:8003)。

**Architecture:** RagPipeline 持有两个 LlmClient 实例，按 `_is_blog_question()` 路由；LlmClient 支持自定义 `base_url`。

**Tech Stack:** Python 3.12+, FastAPI, httpx, pytest + unittest.mock

## Global Constraints

- 只改 `rag-service/` 下的 Python 文件 + `docker-compose.yml`，前端/Nginx/NestJS/入库脚本均不改
- 基座模型 :8003 由用户自行部署（llama.cpp GGUF 或 vLLM CPU），RAG 代码只负责调用
- LlmClient 已支持 `base_url` 参数（重构点），两个客户端共享同一个超时和降级逻辑
- 测试用 MagicMock + AsyncMock，不依赖真实模型服务

---

### Task 1: LlmClient 支持自定义 base_url

**Files:**
- Modify: `rag-service/services/llm_client.py`

**Interfaces:**
- Produces: `LlmClient(base_url: str = None)` —— 默认 `settings.llm_base_url`，可覆盖

- [ ] **Step 1: 修改 LlmClient 构造函数**

```python
class LlmClient:
    def __init__(self, base_url: str | None = None):
        self._base_url = (base_url or settings.llm_base_url).rstrip("/")
        self._timeout = httpx.Timeout(settings.llm_timeout)
        self._client = httpx.AsyncClient(timeout=self._timeout)

    async def chat(self, messages, temperature=0.7, max_tokens=1024):
        ...
        resp = await self._client.post(
            f"{self._base_url}/chat/completions",
            json=payload,
        )
```

- [ ] **Step 2: 验证现有测试仍通过**

Run: `cd rag-service && python -m pytest tests/test_llm_client.py -v`
Expected: 3 tests PASS（mock 测试不受影响）

- [ ] **Step 3: Commit**

```bash
git add rag-service/services/llm_client.py
git commit -m "refactor(rag): LlmClient accepts custom base_url for multi-model support"
```

---

### Task 2: config.py + docker-compose.yml 新增 RAG 模型地址

**Files:**
- Modify: `rag-service/config.py`
- Modify: `docker-compose.yml`

**Interfaces:**
- Produces: `settings.rag_llm_base_url` — 基座模型地址

- [ ] **Step 1: config.py 新增配置项**

在 `llm_base_url` 下面加一行：

```python
  # 模型服务
  llm_base_url: str = "http://127.0.0.1:8001/v1"
  rag_llm_base_url: str = "http://127.0.0.1:8003/v1"  # 基座模型（RAG 知识问答）
  llm_timeout: int = 30
```

- [ ] **Step 2: docker-compose.yml 新增环境变量**

在 rag-service 的 `environment` 下加：

```yaml
      RAG_LLM_BASE_URL: ${RAG_LLM_BASE_URL:-http://host.docker.internal:8003/v1}
```

- [ ] **Step 3: 验证导入**

Run: `cd rag-service && python -c "from config import settings; print(settings.rag_llm_base_url)"`
Expected: `http://127.0.0.1:8003/v1`

- [ ] **Step 4: Commit**

```bash
git add rag-service/config.py docker-compose.yml
git commit -m "feat(rag): add RAG_LLM_BASE_URL config for dual-model routing"
```

---

### Task 3: RagPipeline + main.py 双模型路由

**Files:**
- Modify: `rag-service/rag/pipeline.py`
- Modify: `rag-service/main.py`
- Modify: `rag-service/tests/test_pipeline.py`

**Interfaces:**
- Consumes: `LlmClient(base_url)` from Task 1, `settings.rag_llm_base_url` from Task 2
- Produces: `RagPipeline(embedding, retriever, chat_llm, rag_llm)` — 四参数构造函数

- [ ] **Step 1: 更新测试 —— 博客问题走 rag_llm**

修改 `test_pipeline.py`，fixture 新增 `mock_rag_llm`：

```python
@pytest.fixture
def mock_rag_llm():
    mock = AsyncMock()
    mock.chat.return_value = ChatResponse(
        choices=[{"index": 0, "message": {"role": "assistant", "content": "博客里共有7篇文章：Docker部署指南、NestJS笔记…"}}]
    )
    return mock
```

修改构造函数调用为 `RagPipeline(mock_embedding, mock_retriever, mock_llm, mock_rag_llm)`。

更新 `test_blog_question_triggers_rag`：

```python
@pytest.mark.asyncio
async def test_blog_question_uses_rag_model(mock_embedding, mock_retriever, mock_llm, mock_rag_llm):
    """博客问题应走基座模型，注入检索知识。"""
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm, mock_rag_llm)
    messages = make_messages("我的博客里有什么文章？")

    result = await pipeline.run(messages)

    # 基座模型被调用
    mock_rag_llm.chat.assert_called_once()
    # 角色模型未被调用
    mock_llm.chat.assert_not_called()
    # 检索知识已注入
    called_messages = mock_rag_llm.chat.call_args[0][0]
    system_content = called_messages[0].content
    assert "Docker部署指南" in system_content
```

更新 `test_casual_chat_skips_rag`：

```python
@pytest.mark.asyncio
async def test_casual_chat_uses_chat_model(mock_embedding, mock_retriever, mock_llm, mock_rag_llm):
    """闲聊应走角色模型，不检索。"""
    pipeline = RagPipeline(mock_embedding, mock_retriever, mock_llm, mock_rag_llm)
    messages = make_messages("你好呀，今天心情怎么样？")

    result = await pipeline.run(messages)

    mock_llm.chat.assert_called_once()
    mock_rag_llm.chat.assert_not_called()
    mock_embedding.encode.assert_not_called()
```

其余两个测试也更新为四参数构造，不改断言。

- [ ] **Step 2: 运行测试验证失败**

Run: `cd rag-service && python -m pytest tests/test_pipeline.py -v`
Expected: FAIL — `RagPipeline.__init__() takes 3 positional arguments but 4 were given`

- [ ] **Step 3: 修改 RagPipeline**

```python
class RagPipeline:
    def __init__(
        self,
        embedding: EmbeddingService,
        retriever: Retriever,
        chat_llm: LlmClient,
        rag_llm: LlmClient,
    ):
        self._embedding = embedding
        self._retriever = retriever
        self._chat_llm = chat_llm   # 角色聊天 :8001
        self._rag_llm = rag_llm     # 知识问答 :8003

    async def run(self, messages, temperature=0.7, max_tokens=1024):
        ...
        # 闲聊 → 角色模型
        if not _is_blog_question(last_user):
            logger.info("Casual chat — routing to character model")
            return await self._chat_llm.chat(messages, temperature=temperature, max_tokens=max_tokens)

        # 博客问题 → 检索 + 基座模型
        ...
        if docs:
            augmented = self._inject_context(messages, docs)
            return await self._rag_llm.chat(augmented, temperature=temperature, max_tokens=max_tokens)
        else:
            return await self._rag_llm.chat(messages, temperature=temperature, max_tokens=max_tokens)
```

更新 `_inject_context` 的注入 prompt（简洁直接，不角色化）：

```python
    def _inject_context(self, messages, docs):
        context_parts = [
            "【指令】根据以下博客内容回答用户问题。只回答内容里有的信息，不知道就说不知道。",
            "---",
        ]
        for i, doc in enumerate(docs, 1):
            source_label = "文章" if doc["source_type"] == "post" else "杂谈"
            context_parts.append(
                f"片段{i}（{source_label}《{doc['title']}》）：{doc['content']}"
            )
        context_parts.append("---")
        context_text = "\n".join(context_parts)
        ...
```

- [ ] **Step 4: 修改 main.py**

```python
    chat_llm = LlmClient()  # :8001 角色模型
    rag_llm = LlmClient(base_url=settings.rag_llm_base_url)  # :8003 基座模型
    pipeline = RagPipeline(embedding, retriever, chat_llm, rag_llm)
```

- [ ] **Step 5: 运行测试验证通过**

Run: `cd rag-service && python -m pytest tests/test_pipeline.py -v`
Expected: 4 tests PASS

- [ ] **Step 6: Commit**

```bash
git add rag-service/rag/pipeline.py rag-service/main.py rag-service/tests/test_pipeline.py
git commit -m "feat(rag): dual-model routing — casual chat→character model, blog questions→base model"
```

---

### Task 4: 服务器部署基座模型

**目标:** 在服务器上启动第二个 Qwen3-0.6B 实例（:8003），用作 RAG 知识问答。

- [ ] **Step 1: 下载 Qwen3-0.6B 基座 GGUF**

```bash
# 方案 A：ModelScope（国内可访问）
pip install modelscope
python -c "
from modelscope import snapshot_download
snapshot_download('Qwen/Qwen3-0.6B', local_dir='/opt/models/qwen3-0.6b-base')
"

# 方案 B：如果已通过 HuggingFace 获得基座模型
# 用 llama.cpp 的 convert_hf_to_gguf.py 转换
```

- [ ] **Step 2: 启动基座模型**

```bash
# llama.cpp（推荐，CPU 友好）
./llama-server \
  -m /opt/models/qwen3-0.6b-base/Qwen3-0.6B-Q8_0.gguf \
  --host 127.0.0.1 --port 8003 \
  --ctx-size 2048 -t 2

# 或 vLLM CPU 模式
python -m vllm.entrypoints.openai.api_server \
  --model /opt/models/qwen3-0.6b-base \
  --port 8003 --dtype float16 --device cpu \
  --max-model-len 2048
```

- [ ] **Step 3: 验证基座模型可用**

```bash
curl http://127.0.0.1:8003/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"1+1等于几？"}]}'
# 应返回正确答案 "2"（基座模型不会用流萤语气）
```

- [ ] **Step 4: 拉代码 + 重启 RAG**

```bash
cd /opt/hglblog && git pull origin main
docker compose up -d --build rag-service

# 测试博客问题（应走 :8003 基座模型）
curl -X POST http://127.0.0.1:8002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"我的博客里有什么文章？"}]}'

# 测试闲聊（应走 :8001 角色模型）
curl -X POST http://127.0.0.1:8002/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"流萤，今天过得好吗？"}]}'
```

- [ ] **Step 5: 加为 systemd 服务（可选，保证重启后自动启动）**

```bash
sudo tee /etc/systemd/system/firefly-base-model.service << 'EOF'
[Unit]
Description=Qwen3-0.6B Base Model for RAG
After=network.target

[Service]
ExecStart=/opt/llama.cpp/build/bin/llama-server -m /opt/models/qwen3-0.6b-base/Qwen3-0.6B-Q8_0.gguf --host 127.0.0.1 --port 8003 --ctx-size 2048 -t 2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable firefly-base-model
sudo systemctl start firefly-base-model
```

---

## 实施顺序

```
Task 1 (LlmClient base_url) → Task 2 (config) → Task 3 (pipeline + main.py) → Task 4 (服务器部署)
```

Task 1-3 是代码改动，Task 4 是运维操作。
