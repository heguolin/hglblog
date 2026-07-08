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
