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
