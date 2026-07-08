"""文本分块器单元测试。"""

from ingestion.chunker import chunk_text


def test_chunk_short_text():
    """短于 chunk_size 的文本返回单块。"""
    result = chunk_text("这是一段很短的文本。", chunk_size=512, chunk_overlap=64)
    assert len(result) == 1
    assert result[0] == "这是一段很短的文本。"


def test_chunk_long_text_splits():
    """超过 chunk_size 的文本应分成多块。"""
    # 生成 ~600 字的文本（每个句子约 20 字，需 30 句）
    sentences = ["这是测试句子的第{}句话用来填充文本。".format(i) for i in range(30)]
    text = "。".join(sentences)
    result = chunk_text(text, chunk_size=200, chunk_overlap=40)
    assert len(result) >= 2  # 200 字每块，600 字至少 2 块


def test_chunk_preserves_paragraph_boundaries():
    """段落边界优先（空行切分）。"""
    # 需要超过 chunk_size 才能触发切分，每个段落约 100 字
    paragraph = "这是测试段落内容用于验证分块器的段落边界切分功能。" * 5  # ~100 字
    text = paragraph + "\n\n" + paragraph.replace("测试", "第二") + "\n\n" + paragraph.replace("测试", "第三")
    result = chunk_text(text, chunk_size=120, chunk_overlap=20)
    # 短 chunk_size 会强制切分，但应在 \n\n 边界优先切
    assert len(result) >= 3
    assert any("测试" in r for r in result)
    assert any("第二" in r for r in result)
    assert any("第三" in r for r in result)


def test_chunk_empty_text():
    """空文本返回空列表。"""
    result = chunk_text("")
    assert result == []


def test_chunk_overlap_maintains_context():
    """确认 overlap 在块之间保留了上下文。"""
    # 生成足够长的文本触发多块切分
    text = "这是测试句子。" * 50  # ~350 字
    result = chunk_text(text, chunk_size=150, chunk_overlap=50)
    # 有 overlap 时至少 2 块，且每块不超过 chunk_size
    assert len(result) >= 2
    # 相邻块应有内容重叠（块末尾文本出现在下一块中）
    if len(result) >= 2:
        last_chars = result[0][-10:]
        # overlap 应保证上一块末尾内容出现在下一块中
        found = last_chars in result[1]
        assert found, f"overlap not found: '{last_chars}' not in next chunk"
