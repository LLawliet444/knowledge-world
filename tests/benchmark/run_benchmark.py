"""
Prompt Benchmark 工具

用法：
    cd apps/backend
    python -m tests.benchmark.run_benchmark                    # 跑全部 case
    python -m tests.benchmark.run_benchmark --case how_unknown_once  # 跑指定 case
    python -m tests.benchmark.run_benchmark --report reports/baseline.json  # 指定输出路径

工作流：
1. 加载 cases/ 下所有 .json 测试用例
2. 对每个 case：用 build_teaching_messages 构造 prompt → 调 LLM 生成教学回复
3. 用 judge_prompt + LLM-as-judge 评估回复是否符合期望
4. 输出 pass/fail 报告 + 逐 case 详情

对比 prompt 改动前后：
    改前：python -m tests.benchmark.run_benchmark --report reports/before.json
    改后：python -m tests.benchmark.run_benchmark --report reports/after.json
    然后人工对比两个报告的 pass/fail 差异
"""

import argparse
import asyncio
import json
import pathlib
from datetime import datetime
from typing import Any

import structlog
from pydantic import BaseModel, field_validator

from app.core.llm.openai_adapter import OpenAIAdapter
from app.core.llm.prompts import build_teaching_messages
from app.core.models.interact import TeachingLLMOutput

logger = structlog.get_logger()

# ── 路径常量 ──────────────────────────────────────────────────────────────
_BENCH_DIR = pathlib.Path(__file__).parent
_CASES_DIR = _BENCH_DIR / "cases"
_JUDGE_PROMPT = (_BENCH_DIR / "judge_prompt.md").read_text(encoding="utf-8")
_REPORTS_DIR = _BENCH_DIR / "reports"


# ── Judge 输出 Pydantic 模型 ──────────────────────────────────────────────
class JudgeCheckResult(BaseModel):
    result: str
    reason: str
    evidence: str

    @field_validator("result")
    @classmethod
    def result_must_be_valid(cls, v: str) -> str:
        if v not in ("pass", "fail"):
            raise ValueError(f"result 必须为 pass/fail，得到 {v}")
        return v


class JudgeOutput(BaseModel):
    checks: dict[str, JudgeCheckResult]
    overall: str
    mode_detected: str

    @field_validator("overall")
    @classmethod
    def overall_must_be_valid(cls, v: str) -> str:
        if v not in ("pass", "fail"):
            raise ValueError(f"overall 必须为 pass/fail，得到 {v}")
        return v

    @field_validator("mode_detected")
    @classmethod
    def mode_must_be_valid(cls, v: str) -> str:
        if v not in ("guide", "hint_narrow", "explain_check", "unclear"):
            raise ValueError(f"mode_detected 无效：{v}")
        return v


# ── Case 加载 ─────────────────────────────────────────────────────────────
def load_cases(case_filter: str | None = None) -> list[dict[str, Any]]:
    """加载 cases/ 下所有测试用例，可按 id 过滤"""
    cases = []
    for path in sorted(_CASES_DIR.glob("*.json")):
        case = json.loads(path.read_text(encoding="utf-8"))
        if case_filter and case_filter != case["id"]:
            continue
        cases.append(case)
    if not cases:
        print(f"未找到 case 文件{f'（过滤条件：{case_filter}）' if case_filter else ''}")
    return cases


# ── 生成教学回复 ──────────────────────────────────────────────────────────
async def generate_teaching(
    llm: OpenAIAdapter,
    case: dict[str, Any],
) -> tuple[str, dict[str, Any]]:
    """对单个 case 调用 LLM 生成教学回复，返回 (回复文本, 原始输出 dict)"""
    inputs = case["inputs"]
    messages = build_teaching_messages(
        layer=case["layer"],
        scope_summary=inputs["scope_summary"],
        criteria=inputs["criteria"],
        misconceptions=inputs["misconceptions"],
        previous_summary=inputs.get("previous_summary", ""),
        user_input=inputs["user_input"],
        round_num=inputs["round_num"],
        dialogue_history=inputs["dialogue_history"],
        compressed_summary=inputs.get("compressed_summary", ""),
        accumulated_signals=inputs.get("accumulated_signals"),
    )

    validated = await llm.chat_completion_validated(
        messages=messages,
        output_model=TeachingLLMOutput,
        temperature=0.7,
        max_tokens=1536,
    )
    raw = validated.model_dump()
    text = validated.teaching_content.content
    return text, raw


# ── LLM-as-Judge 评估 ────────────────────────────────────────────────────
def _format_dialogue(history: list[dict[str, str]]) -> str:
    lines = []
    for entry in history:
        role_label = "AI" if entry["role"] == "ai" else "用户"
        lines.append(f"{role_label}：{entry['content']}")
    return "\n".join(lines)


def build_judge_messages(
    case: dict[str, Any],
    llm_output_text: str,
) -> list[dict[str, str]]:
    """构造 judge 评估的 messages"""
    inputs = case["inputs"]
    # 只取最近 3 轮历史，避免 judge 上下文过长
    recent_history = inputs["dialogue_history"][-3:]

    user_content = (
        f"【测试场景】\n"
        f"层级：{case['layer']}\n"
        f"用户输入：{inputs['user_input']}\n"
        f"对话历史（最近3轮）：\n{_format_dialogue(recent_history)}\n\n"
        f"【期望模式】\n{case['expectations']['mode']}\n\n"
        f"【检查项】\n{json.dumps(case['expectations']['checks'], ensure_ascii=False, indent=2)}\n\n"
        f"【LLM 实际输出】\n{llm_output_text}\n"
    )
    return [
        {"role": "system", "content": _JUDGE_PROMPT},
        {"role": "user", "content": user_content},
    ]


async def judge_teaching(
    llm: OpenAIAdapter,
    case: dict[str, Any],
    llm_output_text: str,
) -> JudgeOutput:
    """用 LLM-as-judge 评估教学回复"""
    messages = build_judge_messages(case, llm_output_text)
    # judge 用低温度保证一致性
    validated = await llm.chat_completion_validated(
        messages=messages,
        output_model=JudgeOutput,
        temperature=0.2,
        max_tokens=1024,
    )
    return validated


# ── 单 case 运行 ──────────────────────────────────────────────────────────
async def run_single_case(
    llm: OpenAIAdapter,
    case: dict[str, Any],
) -> dict[str, Any]:
    """跑单个 case：生成 → 评估 → 返回结果"""
    case_id = case["id"]
    print(f"\n{'='*60}")
    print(f"Case: {case_id}")
    print(f"描述: {case['description']}")
    print(f"期望模式: {case['expectations']['mode']}")

    # Step 1: 生成教学回复
    try:
        gen_text, gen_raw = await generate_teaching(llm, case)
        print(f"\n[生成回复]\n{gen_text[:200]}...")
    except Exception as e:
        print(f"\n[生成失败] {e}")
        return {
            "case_id": case_id,
            "description": case["description"],
            "expected_mode": case["expectations"]["mode"],
            "status": "generation_failed",
            "error": str(e),
            "llm_output": None,
            "judge": None,
        }

    # Step 2: LLM-as-judge 评估
    try:
        judge_result = await judge_teaching(llm, case, gen_text)
        checks_summary = {k: v.result for k, v in judge_result.checks.items()}
        print(f"\n[评估结果] overall={judge_result.overall} mode={judge_result.mode_detected}")
        for check_name, check_result in judge_result.checks.items():
            mark = "✓" if check_result.result == "pass" else "✗"
            print(f"  {mark} {check_name}: {check_result.reason}")
    except Exception as e:
        print(f"\n[评估失败] {e}")
        return {
            "case_id": case_id,
            "description": case["description"],
            "expected_mode": case["expectations"]["mode"],
            "status": "judge_failed",
            "error": str(e),
            "llm_output": gen_text,
            "judge": None,
        }

    return {
        "case_id": case_id,
        "description": case["description"],
        "expected_mode": case["expectations"]["mode"],
        "status": "ok",
        "llm_output": gen_text,
        "judge": {
            "overall": judge_result.overall,
            "mode_detected": judge_result.mode_detected,
            "checks": {
                k: {
                    "result": v.result,
                    "reason": v.reason,
                    "evidence": v.evidence,
                }
                for k, v in judge_result.checks.items()
            },
        },
    }


# ── 主流程 ────────────────────────────────────────────────────────────────
async def run_benchmark(case_filter: str | None, report_path: str | None) -> None:
    cases = load_cases(case_filter)
    if not cases:
        return

    llm = OpenAIAdapter()
    print(f"加载 {len(cases)} 个 case，开始 benchmark...")

    results = []
    for case in cases:
        result = await run_single_case(llm, case)
        results.append(result)

    # 汇总统计
    total = len(results)
    passed = sum(
        1 for r in results
        if r["status"] == "ok" and r["judge"] and r["judge"]["overall"] == "pass"
    )
    failed = sum(
        1 for r in results
        if r["status"] == "ok" and r["judge"] and r["judge"]["overall"] == "fail"
    )
    errors = sum(1 for r in results if r["status"] != "ok")

    print(f"\n{'='*60}")
    print(f"Benchmark 汇总")
    print(f"{'='*60}")
    print(f"总数: {total}  通过: {passed}  失败: {failed}  错误: {errors}")
    print(f"通过率: {passed/total*100:.0f}%" if total else "无 case")

    # 逐 case 汇总
    print(f"\n{'─'*60}")
    for r in results:
        if r["status"] != "ok":
            mark = "⚠"
            detail = r.get("error", "")[:60]
        elif r["judge"]["overall"] == "pass":
            mark = "✓"
            detail = f"mode={r['judge']['mode_detected']}"
        else:
            mark = "✗"
            failed_checks = [
                k for k, v in r["judge"]["checks"].items() if v["result"] == "fail"
            ]
            detail = f"failed: {','.join(failed_checks)}"
        print(f"  {mark} {r['case_id']}: {detail}")

    # 写报告
    report = {
        "timestamp": datetime.now().isoformat(),
        "total": total,
        "passed": passed,
        "failed": failed,
        "errors": errors,
        "pass_rate": round(passed / total, 3) if total else 0,
        "results": results,
    }

    if report_path:
        out = pathlib.Path(report_path)
    else:
        _REPORTS_DIR.mkdir(exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        out = _REPORTS_DIR / f"benchmark_{ts}.json"

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n报告已写入: {out}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Prompt Benchmark 工具")
    parser.add_argument(
        "--case",
        type=str,
        default=None,
        help="只跑指定 id 的 case（不指定则跑全部）",
    )
    parser.add_argument(
        "--report",
        type=str,
        default=None,
        help="报告输出路径（不指定则写入 reports/benchmark_<timestamp>.json）",
    )
    args = parser.parse_args()
    asyncio.run(run_benchmark(args.case, args.report))


if __name__ == "__main__":
    main()
