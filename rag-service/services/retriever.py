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
