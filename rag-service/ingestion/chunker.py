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
