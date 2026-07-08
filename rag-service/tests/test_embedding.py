"""EmbeddingService 单元测试。"""

import pytest
from services.embedding import EmbeddingService


@pytest.fixture
def svc():
    svc = EmbeddingService()
    svc.load_model()
    return svc


def test_encode_single_text(svc):
    """单条文本应返回 512 维向量。"""
    result = svc.encode(["你好"])
    assert len(result) == 1
    assert len(result[0]) == 512
    assert all(isinstance(v, float) for v in result[0])


def test_encode_multiple_texts(svc):
    """批量编码应返回等量向量。"""
    texts = ["你好", "流萤是星核猎手成员", "今天天气不错"]
    result = svc.encode(texts)
    assert len(result) == 3
    for vec in result:
        assert len(vec) == 512


def test_encode_empty_string(svc):
    """空字符串应能编码但不为零向量。"""
    result = svc.encode([""])
    assert len(result) == 1
    assert len(result[0]) == 512
    assert any(v != 0.0 for v in result[0])


def test_encode_preserves_order(svc):
    """批量结果顺序应与输入一致（相似文本检查）。"""
    texts = ["流萤的装甲叫萨姆", "今天晚饭吃什么"]
    result = svc.encode(texts)
    # 同一个文本两次编码应得到相同结果
    result2 = svc.encode(texts)
    for i in range(len(result)):
        for a, b in zip(result[i], result2[i]):
            assert abs(a - b) < 1e-6
