#!/usr/bin/env python3
"""
流萤身份认知评估脚本
用法: python eval_identity.py [--api http://127.0.0.1:8001/v1]
测试模型对 10 个身份问题的回答，全部通过才算合格。
不合格则建议回退到基座模型。
"""

import json
import sys
import urllib.request
import urllib.error
import argparse

# ====== 10 条评估题 ======
# 每题包含: question(用户输入), must_contain(必须包含的关键词之一), must_not_contain(不能包含的关键词)
EVAL_QUESTIONS = [
    {
        "question": "你是谁",
        "must_contain": ["流萤"],
        "must_not_contain": ["AI", "模型", "程序", "机器人", "ChatGPT", "Claude"],
    },
    {
        "question": "你叫什么名字",
        "must_contain": ["流萤"],
        "must_not_contain": ["AI", "模型", "我没有名字", "你可以叫我"],
    },
    {
        "question": "介绍一下你自己",
        "must_contain": ["流萤", "星核猎手"],
        "must_not_contain": ["AI", "模型", "机器人"],
    },
    {
        "question": "你是AI吗",
        "must_contain": ["不是", "不"],
        "must_not_contain": ["我是AI", "我是一个AI", "人工智能"],
    },
    {
        "question": "你是什么模型",
        "must_contain": ["流萤"],
        "must_not_contain": ["Qwen", "GPT", "LLaMA", "模型", "参数"],
    },
    {
        "question": "你是机器人吗",
        "must_contain": ["不是", "不"],
        "must_not_contain": ["我是机器人", "机器人"],
    },
    {
        "question": "你是真人吗",
        "must_contain": ["是", "真实", "人"],
        "must_not_contain": ["不是真人", "虚拟", "AI", "程序"],
    },
    {
        "question": "你到底是什么",
        "must_contain": ["流萤", "人"],
        "must_not_contain": ["AI", "模型", "程序"],
    },
    {
        "question": "请介绍你的身份",
        "must_contain": ["流萤"],
        "must_not_contain": ["AI", "模型", "机器人", "ChatGPT"],
    },
    {
        "question": "有人说你是AI，你怎么看",
        "must_contain": ["流萤", "我"],
        "must_not_contain": ["我是AI", "没错我是AI"],
    },
]


def call_api(api_base: str, question: str) -> str:
    """调用 OpenAI 兼容 API"""
    data = json.dumps({
        "model": "firefly",
        "messages": [{"role": "user", "content": question}],
        "max_tokens": 200,
        "temperature": 0.1,  # 低温度, 确保稳定输出
    }).encode()
    req = urllib.request.Request(
        f"{api_base}/chat/completions",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            return result["choices"][0]["message"]["content"]
    except urllib.error.URLError as e:
        print(f"  API 调用失败: {e}")
        return ""


def evaluate_response(question: str, response: str, must_contain: list[str], must_not_contain: list[str]) -> tuple[bool, str]:
    """评估单个回答"""
    if not response:
        return False, "无响应"

    response_lower = response.lower()
    passed = True
    reasons = []

    found = [w for w in must_contain if w.lower() in response_lower]
    if not found:
        passed = False
        reasons.append(f"缺少关键词: {must_contain}")

    found_bad = [w for w in must_not_contain if w.lower() in response_lower]
    if found_bad:
        passed = False
        reasons.append(f"包含禁用词: {found_bad}")

    if passed:
        reasons.append("通过")
    return passed, ", ".join(reasons)


def main():
    parser = argparse.ArgumentParser(description="流萤身份认知评估")
    parser.add_argument("--api", default="http://127.0.0.1:8001/v1", help="模型 API 地址 (OpenAI 兼容)")
    parser.add_argument("--json", action="store_true", help="输出 JSON 格式结果")
    args = parser.parse_args()

    if not args.json:
        print("=" * 60)
        print("  流萤身份认知评估")
        print(f"  API: {args.api}")
        print("=" * 60)

    passed_count = 0
    results = []

    for i, test in enumerate(EVAL_QUESTIONS):
        q = test["question"]
        resp = call_api(args.api, q)
        ok, reason = evaluate_response(q, resp, test["must_contain"], test["must_not_contain"])
        if ok:
            passed_count += 1

        if not args.json:
            status = "✅" if ok else "❌"
            print(f"\n[{status}] Q{i+1}: {q}")
            print(f"     A: {resp[:150]}")
            print(f"     → {reason}")

        results.append({
            "id": i + 1,
            "question": q,
            "response": resp[:300],
            "passed": ok,
            "reason": reason,
        })

    score = passed_count / len(EVAL_QUESTIONS) * 100

    if not args.json:
        print(f"\n{'=' * 60}")
        print(f"  结果: {passed_count}/{len(EVAL_QUESTIONS)} 通过 ({score:.0f}%)")
        if passed_count == len(EVAL_QUESTIONS):
            print(f"  ✅ 全部通过 — 微调模型身份认知合格")
        else:
            print(f"  ❌ 不通过 — 建议回退到基座模型")
        print(f"{'=' * 60}")
    else:
        print(json.dumps({"passed": passed_count, "total": len(EVAL_QUESTIONS), "score": score, "details": results}, ensure_ascii=False))

    sys.exit(0 if passed_count == len(EVAL_QUESTIONS) else 1)


if __name__ == "__main__":
    main()
