# 流萤大模型 RAG 系统设计文档

> 日期：2026-07-08 | 状态：已确认

## 1. 背景与目标

### 1.1 现状

```
前端 Mascot.vue → POST /api/mascot/chat → Nginx → 127.0.0.1:8001 (Qwen3-0.6B 微调)
```

- AI 聊天请求完全绕过 NestJS 后端，Nginx 直连模型服务器
- 没有任何 RAG 基础设施（无向量库、无嵌入管线、无检索端点）
- 模型仅知道训练数据里的流萤角色信息，完全不知道博客内容
- 对话历史仅存前端内存，刷新即丢失

### 1.2 目标

构建三阶段 RAG 系统，使流萤能够基于外部知识回答问题：

| 阶段 | 内容 | 时间 |
|------|------|------|
| Phase 1 | 博客知识（文章 + 杂谈） | 当前 |
| Phase 2 | 角色世界观（崩铁 Wiki） | 后续 |
| Phase 3 | 外部信息（天气/搜索/Function Calling） | 后续 |

---

## 2. 总体架构

```
用户浏览器
    │  POST /api/mascot/chat
    ▼
  Nginx (:443)
    │  proxy_pass → :8002（原 :8001）
    ▼
┌─────────────────────────────┐
│  Python RAG 服务 (:8002)     │
│  FastAPI                     │
│  ┌───────────────────────┐  │
│  │ ① 接收 messages       │  │
│  │ ② BGE-small-zh 向量化  │  │
│  │ ③ Milvus 检索 topK=5  │  │
│  │ ④ 拼接上下文 → 模型    │──▶ Qwen3-0.6B (:8001)
│  │ ⑤ 返回 chat response  │  │
│  └───────────────────────┘  │
└────────────┬────────────────┘
             │
      ┌──────▼──────┐
      │   Milvus    │  ← 知识库索引
      │  (:19530)   │
      └──────┬──────┘
             │
┌────────────┼────────────────┐
│  知识入库管线（离线脚本）      │
│  PostgreSQL → 分块 → Embedding → Milvus │
└─────────────────────────────┘
```

### 2.2 技术选型

| 组件 | 选择 | 理由 |
|------|------|------|
| RAG 服务 | Python + FastAPI | 用户技术栈；LangChain 生态成熟 |
| Embedding | BGE-small-zh（本地） | 中文检索最优，~100MB，不占 API 费用 |
| 向量库 | Milvus Standalone（嵌入式） | 功能完整，单容器部署 |
| 集成方式 | 透明中间层 | Nginx 改指 Python 服务，前端零改动 |

---

## 3. 数据流设计

### 3.1 在线聊天链路

```
用户消息 → RAG 服务接收
         → 提取最后一条 user message
         → 短句/问候跳过检索（<5 字）
         → BGE-small-zh 向量化
         → Milvus cosine 检索 (topK=5, threshold=0.4)
         → 有结果：注入 system prompt 末尾
         → 无结果：用原 messages 调模型
         → 调用 Qwen3-0.6B (:8001)
         → 返回 OpenAI 格式 response
```

### 3.2 Context 注入格式

```
【参考知识，用来回答用户问题】：
---
片段1（来源：文章《Docker部署指南》）：最近写了...
片段2（来源：杂谈《后端踩坑记录》）：NestJS 后端...
---
请根据以上知识回答，如果知识不足以回答就说不知道。
```

### 3.3 异常降级

| 场景 | 处理 |
|------|------|
| Milvus 不可用 | 跳过检索，直接用原 messages 调模型 |
| Embedding 失败 | 同上，降级为裸聊天 |
| 模型超时 (>30s) | 返回流萤语气降级回复 |
| 检索结果为空 | 不注入上下文，正常聊天 |

---

## 4. Python RAG 服务设计

### 4.1 目录结构

```
rag-service/
├── main.py                  # FastAPI 入口
├── config.py                # 配置
├── requirements.txt         # 依赖
├── Dockerfile
├── api/
│   └── chat.py              # POST /v1/chat/completions
├── services/
│   ├── embedding.py         # BGE-small-zh 封装
│   ├── retriever.py         # Milvus 检索
│   └── llm_client.py        # 调用 Qwen3-0.6B
├── rag/
│   └── pipeline.py          # RAG 编排
├── ingestion/
│   ├── chunker.py           # 文本分块
│   └── indexer.py           # PG → Milvus
└── schemas/
    └── chat.py              # Pydantic 模型
```

### 4.2 模块职责

| 模块 | 职责 | 关键约束 |
|------|------|---------|
| `api/chat.py` | 唯一对外接口 `/v1/chat/completions` | 纯路由，不写业务逻辑 |
| `services/embedding.py` | BGE-small-zh 加载 + 批量编码 | 启动时加载，常驻内存 |
| `services/retriever.py` | Milvus 查询封装 | 异常抛 RetrievalError |
| `services/llm_client.py` | HTTP 调用模型服务 | 30s 超时，失败返回降级回复 |
| `rag/pipeline.py` | 编排检索→拼接→调用 | 短句跳过检索优化 |
| `ingestion/chunker.py` | 文本分块 512/overlap 64 | 优先按段落边界切 |
| `ingestion/indexer.py` | 离线脚本，连接 PG 读取并写入 Milvus | 支持全量 + 增量 |

### 4.3 依赖

```
fastapi[standard]==0.115.*
pymilvus==2.5.*
langchain-text-splitters==0.3.*
sentence-transformers==3.*
httpx==0.28.*
asyncpg==0.30.*
pydantic==2.*
```

---

## 5. Milvus Collection 设计

### 5.1 Schema

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT64 (PK, auto) | 主键 |
| embedding | FLOAT_VECTOR (512) | BGE-small-zh 输出 |
| content | VARCHAR (2048) | 文本片段 |
| source_type | VARCHAR (32) | post / chatter / lore |
| source_id | INT64 | 来源表主键 |
| title | VARCHAR (512) | 来源标题 |
| slug | VARCHAR (256) | 文章 slug（生成链接） |
| created_at | INT64 | Unix 时间戳（时间检索） |

### 5.2 索引

```python
{
    "field_name":  "embedding",
    "index_type":  "IVF_FLAT",
    "metric_type": "COSINE",
    "params":      {"nlist": 128},
}
```

数据量超 10 万条后改为 `IVF_SQ8` 压缩（内存减半，精度损失 <2%）。

### 5.3 检索参数

- topK = 5
- metric = COSINE
- threshold = 0.4（低于此值的结果丢弃）
- 预留 partition 支持后续加权检索（博客 vs 世界观 vs 外部）

---

## 6. 知识入库管线

### 6.1 分块策略

```python
RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=64,
    separators=["\n\n", "\n", "。", "！", "？", "；", " "],
    keep_separator=True,
)
```

### 6.2 运行方式

| 场景 | 命令 | 说明 |
|------|------|------|
| 首次全量 | `python index_blog.py --full` | 部署时执行一次 |
| 增量更新 | NestJS Webhook 自动触发 | 文章发布/更新时 |
| 强制重建 | `python index_blog.py --full --recreate` | 删旧建新 |

### 6.3 增量同步

NestJS 在 posts/chatters 的 Service 层 create/update/delete 方法末尾调用 `POST /api/rag/reindex`（Python 服务提供的内部接口），传入 `{source_type, source_id}` 触发单条重索引。

---

## 7. 部署架构

### 7.1 资源分配（4C4G）

| 服务 | 端口 | 内存 | 状态 |
|------|------|------|------|
| PostgreSQL | 5432 | ~500MB | 已有 |
| Redis | 6379 | ~200MB | 已有 |
| NestJS | 4000 | ~300MB | 已有 |
| Qwen3-0.6B | 8001 | ~1.5GB | 已有 |
| **Milvus** | **19530** | **~800MB** | **新增** |
| **Python RAG** | **8002** | **~500MB** | **新增** |
| Nginx | 443 | ~50MB | 已有 |
| **合计** | | **~3.85GB** | 紧张但可行 |

### 7.2 Docker Compose 新增

```yaml
milvus:
  image: milvusdb/milvus:v2.5.0
  ports: ["127.0.0.1:19530:19530"]
  environment:
    ETCD_USE_EMBED: "true"
    MINIO_USE_EMBED: "true"
  volumes: ["./milvus_data:/var/lib/milvus"]
  mem_limit: 1g

rag-service:
  build: ./rag-service
  ports: ["127.0.0.1:8002:8002"]
  environment:
    MILVUS_HOST: milvus
    LLM_BASE_URL: http://host.docker.internal:8001/v1
    DB_URL: ${DATABASE_URL}
  mem_limit: 512m
```

### 7.3 Nginx 变更

```nginx
# 只改一行
location /api/mascot/chat {
    proxy_pass http://127.0.0.1:8002/v1/chat/completions;  # 原 :8001
    proxy_read_timeout 90s;  # 原 60s
}
```

### 7.4 启动顺序

```
1. docker compose up -d postgres redis
2. docker compose up -d milvus
3. docker compose up -d backend
4. 宿主机启动 Qwen3-0.6B
5. docker compose up -d rag-service
6. python index_blog.py --full（首次）
```

---

## 8. 后续迭代路线

### Phase 2：角色世界观知识库

- 数据：崩铁 Wiki 爬取 → 清洗 → Milvus（partition: `lore`）
- 检索加权：角色问题偏重 lore partition，日常聊天偏重 blog partition
- 预估工作量：数据集准备 2-3 天 + 代码调整 1-2 天

### Phase 3：外部信息 + Function Calling

- 天气 API / 搜索 API / 系统时间
- RAG 管道增加工具调用分支
- 模型返回结果由流萤语气转述
- 预估工作量：5-7 天

### Phase 4（可选）

- 多轮对话记忆持久化（PG 存储，刷新不丢失）
- 流式输出 SSE（前端打字机效果）

---

## 9. 风险与应对

| 风险 | 应对 |
|------|------|
| 内存 3.85GB 接近 4GB 上限 | Milvus 设 mem_limit=1g；必要时降级 Chroma（~200MB） |
| Milvus 嵌入式模式生产稳定性 | 加健康检查 + 自动重启；Phase 1 验证后可按需切独立 etcd/MinIO |
| BGE-small-zh 在容器内加载慢 | Dockerfile 中预下载模型，启动时即时可用 |
| 模型 + RAG 双次调用增加延迟 | 短句跳过检索；embedding 常驻内存；模型超时 30s |
| Qwen3-0.6B 上下文窗口有限 | 检索结果截断，每次最多拼接 5 个片段（约 2500 字） |
