"""博客知识入库管线 — PostgreSQL → 分块 → Embedding → Milvus。

用法:
  python -m ingestion.indexer --full              # 全量入库
  python -m ingestion.indexer --full --recreate   # 删旧建新（强制重建）
  python -m ingestion.indexer --source-type post --source-id 5   # 增量更新单条
"""

import sys
import asyncio
import logging
import asyncpg
from typing import Optional
from config import settings
from services.embedding import EmbeddingService
from services.retriever import Retriever
from ingestion.chunker import chunk_text

logger = logging.getLogger("rag.indexer")

VALID_SOURCE_TYPES = {"post", "chatter"}


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
    if source_type not in VALID_SOURCE_TYPES:
        raise ValueError(
            f"Invalid source_type '{source_type}'. Must be one of {VALID_SOURCE_TYPES}"
        )

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


async def run_full(recreate: bool = False, embedding: Optional[EmbeddingService] = None):
    """全量入库：读取所有文章和杂谈 → 分块 → embedding → Milvus。"""
    if embedding is None:
        logger.info("Loading embedding model...")
        embedding = EmbeddingService()
        embedding.load_model()

    logger.info("Connecting to Milvus...")
    retriever = Retriever()
    retriever.connect()
    retriever.create_collection(drop_existing=recreate)
    logger.info("Collection ready.")

    logger.info("Connecting to PostgreSQL...")
    pg = await asyncpg.connect(settings.database_url)

    items = await fetch_posts(pg) + await fetch_chatters(pg)
    logger.info("Found %d items to index.", len(items))

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
        logger.info(
            "Progress: %d/%d — %d chunks",
            min(i + batch_size, len(items)), len(items), total_chunks,
        )

    await pg.close()
    logger.info("Done. Total %d chunks indexed.", total_chunks)


async def run_incremental(
    source_type: str,
    source_id: int,
    embedding: Optional[EmbeddingService] = None,
):
    """增量更新：删除旧 chunks → 重新分块入库。"""
    logger.info("Incremental update: %s#%d", source_type, source_id)

    if embedding is None:
        logger.info("Loading embedding model...")
        embedding = EmbeddingService()
        embedding.load_model()

    retriever = Retriever()
    retriever.connect()
    retriever.create_collection(drop_existing=False)

    pg = await asyncpg.connect(settings.database_url)
    item = await fetch_single(pg, source_type, source_id)
    if item is None:
        logger.info("Source %s#%d not found — deleting existing chunks.", source_type, source_id)
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
        logger.info("Indexed %d chunks for %s#%d", len(batch), source_type, source_id)
    else:
        logger.info("No content to index for %s#%d", source_type, source_id)

    await pg.close()


# ---------- CLI ----------

def print_usage():
    print(__doc__)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    )

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
