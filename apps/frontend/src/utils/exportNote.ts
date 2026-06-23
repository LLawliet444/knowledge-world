/**
 * 思考笔记导出工具
 *
 * 将节点思考笔记 / 全书合集导出为 Markdown 文件。
 */

import type { NodeRecord, BookRecord } from "../store/knowledgeStore";

/** 将单个节点的思考笔记格式化为 Markdown 段落 */
function nodeToMarkdown(node: NodeRecord, chapterNum: number): string {
  const lines: string[] = [];
  lines.push(`## 第 ${chapterNum} 章 · ${node.nodeName}`);
  lines.push("");

  const layers: [string, string][] = [
    ["How · 你的理解", node.layers.how?.userInput ?? "（未记录）"],
    ["Why · 你的分析", node.layers.why?.userInput ?? "（未记录）"],
    ["System · 你的延伸", node.layers.system?.userInput ?? "（未记录）"],
    ["最终回答", node.layers.final?.userInput ?? "（未记录）"],
  ];

  for (const [label, answer] of layers) {
    lines.push(`### ${label}`);
    lines.push("");
    lines.push(answer);
    lines.push("");
  }

  if (node.thinkingNote.keywords.length > 0) {
    lines.push(`> 关键词：${node.thinkingNote.keywords.join(" · ")}`);
    lines.push("");
  }

  return lines.join("\n");
}

/** 将全书合集导出为 Markdown 字符串 */
export function bookToMarkdown(book: BookRecord): string {
  const lines: string[] = [];

  lines.push("# 我的《人类简史》");
  lines.push("");
  lines.push(`> 探索之旅 · ${new Date(book.generatedAt).toLocaleDateString("zh-CN")}`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // 前言
  lines.push("## 前言 · 你的探索之旅");
  lines.push("");
  lines.push(
    "这是你在 Knowledge World 中探索《人类简史》时留下的思考记录。\n" +
    "你走过了 7 个知识节点，从认知革命到科学革命，在 What / How / Why / System 四个维度中层层深入。\n" +
    "以下是你自己的回答和思考——它们不属于书本，只属于你。",
  );
  lines.push("");

  // 各章节
  book.nodes.forEach((node, i) => {
    lines.push(nodeToMarkdown(node, i + 1));
    lines.push("---");
    lines.push("");
  });

  // 后记
  lines.push("## 后记 · 你的收获");
  lines.push("");

  // 汇总关键词
  const allKeywords = new Set<string>();
  for (const node of book.nodes) {
    for (const kw of node.thinkingNote.keywords) {
      allKeywords.add(kw);
    }
  }
  if (allKeywords.size > 0) {
    lines.push(`你在探索中提到了这些关键词：${[...allKeywords].join(" · ")}`);
    lines.push("");
  }

  lines.push("感谢你走完这段旅程。每一个字都是你自己的思考。");
  lines.push("");

  return lines.join("\n");
}

/** 触发浏览器下载 Markdown 文件 */
export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
