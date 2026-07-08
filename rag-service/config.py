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

  # Embedding — EMBEDDING_MODEL 可设为模型名（需联网）或本地路径
  # 国内服务器用法: EMBEDDING_MODEL=/app/models/bge-small-zh
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
    for key in self.__dataclass_fields__:
      env_val = os.getenv(key.upper())
      if env_val is not None:
        target_type = type(getattr(self, key))
        if target_type == bool:
          setattr(self, key, env_val.lower() in ("1", "true", "yes"))
        else:
          setattr(self, key, target_type(env_val))


settings = Settings()
