"""Chroma 向量检索封装 — 进程内运行，数据持久化到本地磁盘，无需独立服务。"""

from typing import List, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from config import settings


class Retriever:
    def __init__(self):
        self._client = None
        self._collection = None

    # ---------- 连接 ----------

    def connect(self) -> None:
        """连接 Chroma（进程内，不需要外部服务）。"""
        self._client = chromadb.PersistentClient(
            path=settings.chroma_persist_path,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

    # ---------- Collection 管理 ----------

    def create_collection(self, drop_existing: bool = False) -> None:
        """创建或打开 blog_knowledge collection。"""
        if drop_existing:
            try:
                self._client.delete_collection(settings.chroma_collection)
            except Exception:
                pass

        self._collection = self._client.get_or_create_collection(
            name=settings.chroma_collection,
            metadata={"hnsw:space": "cosine"},
        )

    # ---------- 检索 ----------

    def search(
        self,
        vector: List[float],
        top_k: Optional[int] = None,
        threshold: Optional[float] = None,
    ) -> List[dict]:
        """余弦相似度检索，返回超过阈值的文档列表。"""
        if top_k is None:
            top_k = settings.retrieval_top_k
        if threshold is None:
            threshold = settings.retrieval_threshold

        if self._collection is None:
            self.create_collection(drop_existing=False)

        results = self._collection.query(
            query_embeddings=[vector],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
        )

        docs = []
        ids = results.get("ids", [[]])[0]
        distances = results.get("distances", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        documents = results.get("documents", [[]])[0]

        if not ids:
            return docs

        for i, doc_id in enumerate(ids):
            distance = distances[i] if i < len(distances) else 0.0
            score = 1.0 - (distance / 2.0)  # cosine distance → similarity
            if score >= threshold:
                meta = metadatas[i] if i < len(metadatas) else {}
                docs.append({
                    "content": documents[i] if i < len(documents) else "",
                    "score": score,
                    "source_type": meta.get("source_type", ""),
                    "source_id": meta.get("source_id", 0),
                    "title": meta.get("title", ""),
                    "slug": meta.get("slug", ""),
                    "created_at": meta.get("created_at", 0),
                })
        return docs

    # ---------- 写入 ----------

    def insert(self, data: List[dict]) -> None:
        """批量插入文档。"""
        if self._collection is None:
            self.create_collection(drop_existing=False)

        ids = [str(i) for i in range(self._collection.count(), self._collection.count() + len(data))]
        embeddings = [d["embedding"] for d in data]
        documents = [d["content"] for d in data]
        metadatas = [{
            "source_type": d["source_type"],
            "source_id": d["source_id"],
            "title": d.get("title", ""),
            "slug": d.get("slug", ""),
            "created_at": d.get("created_at", 0),
        } for d in data]

        if ids:
            self._collection.add(ids=ids, embeddings=embeddings, documents=documents, metadatas=metadatas)

    # ---------- 删除 ----------

    def delete_by_source(self, source_type: str, source_id: int) -> None:
        """删除指定来源的所有片段（增量更新用）。"""
        if self._collection is None:
            self.create_collection(drop_existing=False)

        self._collection.delete(
            where={"$and": [
                {"source_type": {"$eq": source_type}},
                {"source_id": {"$eq": source_id}},
            ]}
        )
