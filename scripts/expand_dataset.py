#!/usr/bin/env python3
"""从 plot dialogue.md 提取 488 条对话，匹配合适的用户问题，扩充数据集"""

import json
import re
import sys
from pathlib import Path

# 复用 generate 里的 System Prompt
sys.path.insert(0, str(Path(__file__).parent))
from generate_firefly_dataset import SYSTEM_PROMPT

# 抽取游戏对话中流萤的台词（去掉旁白和过短的）
def extract_firefly_lines(dialogue_path: str) -> list[str]:
    with open(dialogue_path, encoding="utf-8") as f:
        text = f.read()
    lines = []
    for line in text.split("\n"):
        line = line.strip()
        # 去编号
        line = re.sub(r"^\d+\.\s*", "", line)
        line = re.sub(r"^（.*?）\s*", "", line)
        line = re.sub(r"^\(.*?\)\s*", "", line)
        if not line or len(line) < 4:
            continue
        # 过滤纯描述
        if any(kw in line for kw in ["黄金时刻", "格拉默", "边境", "建设"]):
            if len(line) > 60:  # 长叙述保留
                pass
            elif len(line) < 15:
                continue
        lines.append(line)
    # 去重
    seen = set()
    unique = []
    for l in lines:
        if l not in seen:
            seen.add(l)
            unique.append(l)
    return unique

# 为流萤台词匹配用户问题
QUESTION_PATTERNS = [
    "然后呢？",
    "真的吗？",
    "你当时是什么感觉？",
    "后来发生了什么？",
    "那你害怕吗？",
    "开拓者怎么说的？",
    "那个地方是什么样的？",
    "你最喜欢匹诺康尼的哪里？",
    "说说你在星核猎手的故事吧。",
    "你和银狼关系好吗？",
    "卡芙卡对你怎么样？",
    "你现在还会想那些事吗？",
    "那段经历对你意味着什么？",
    "那时候你在想什么？",
    "如果再来一次，你会怎么做？",
    "你是怎么认识开拓者的？",
    "匹诺康尼让你印象最深的是什么？",
]

def expand_dataset(dialogue_path: str, output_path: str, limit: int = 100):
    lines = extract_firefly_lines(dialogue_path)
    entries = []
    seen_assistant = set()

    for line in lines:
        if len(entries) >= limit:
            break
        if line in seen_assistant or len(line) < 8:
            continue
        seen_assistant.add(line)

        # 挑一个合适的用户问题
        q_idx = len(entries) % len(QUESTION_PATTERNS)
        user_q = QUESTION_PATTERNS[q_idx]

        entry = {
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_q},
                {"role": "assistant", "content": line},
            ]
        }
        entries.append(entry)

    # 追加到已有数据集
    existing = []
    if Path(output_path).exists():
        with open(output_path, encoding="utf-8") as f:
            for line in f:
                try:
                    existing.append(json.loads(line))
                except json.JSONDecodeError:
                    pass

    all_entries = existing + entries
    with open(output_path, "w", encoding="utf-8") as f:
        for entry in all_entries:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    print(f"从 {len(lines)} 条游戏对话中提取 {len(entries)} 条 → {output_path}（总计 {len(all_entries)} 条）")

if __name__ == "__main__":
    dialog_path = sys.argv[1] if len(sys.argv) > 1 else "firefly.skill-main/references/plot dialogue.md"
    out_path = sys.argv[2] if len(sys.argv) > 2 else "scripts/firefly_dataset.jsonl"
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 100
    expand_dataset(dialog_path, out_path, limit)
