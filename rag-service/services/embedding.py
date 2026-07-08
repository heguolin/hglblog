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
