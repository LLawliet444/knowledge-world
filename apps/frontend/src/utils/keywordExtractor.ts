/**
 * 关键词提取工具
 *
 * 从用户回答文本中提取领域关键词。
 * 策略：以节点的参考文本（sourceExcerpt + whatCards）为词库，
 * 提取 2-4 字子串，检查哪些出现在用户回答中，按频次排序。
 */

/** 中文停用词，过滤无意义的高频片段 */
const STOPWORDS = new Set([
  "我们", "他们", "这个", "那个", "什么", "可以", "因为", "所以", "但是",
  "就是", "也是", "还是", "不过", "现在", "一个", "这种", "那种", "通过",
  "使得", "能够", "以及", "或者", "比如", "例如", "其实", "的话", "的话",
  "的话", "了的", "是的", "在了", "就是", "不了", "的是", "的是",
]);

/**
 * 从参考文本中提取候选关键词（2-4 字）
 */
function extractCandidates(referenceText: string): string[] {
  const candidates = new Set<string>();
  // 移除标点和空白，保留中英文
  const clean = referenceText.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, "");
  for (let len = 2; len <= 4; len++) {
    for (let i = 0; i <= clean.length - len; i++) {
      const sub = clean.slice(i, i + len);
      if (!STOPWORDS.has(sub)) {
        candidates.add(sub);
      }
    }
  }
  return [...candidates];
}

/**
 * 从用户回答中提取关键词
 *
 * @param answers 用户在各层的回答文本
 * @param referenceText 节点的参考文本（sourceExcerpt + whatCards 文本）
 * @param maxCount 最多返回的关键词数量
 */
export function extractKeywords(
  answers: string[],
  referenceText: string,
  maxCount = 6,
): string[] {
  const combinedAnswers = answers.join(" ");
  if (!combinedAnswers.trim()) return [];

  const candidates = extractCandidates(referenceText);
  const freq = new Map<string, number>();

  for (const candidate of candidates) {
    // 统计在用户回答中出现的次数
    let count = 0;
    let idx = combinedAnswers.indexOf(candidate);
    while (idx !== -1) {
      count++;
      idx = combinedAnswers.indexOf(candidate, idx + 1);
    }
    if (count > 0) {
      freq.set(candidate, count);
    }
  }

  // 按频次降序，取前 maxCount 个
  // 优先取较长的词（4字 > 3字 > 2字），避免短词被长词包含
  const sorted = [...freq.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return b[0].length - a[0].length;
    })
    .map(([word]) => word);

  // 去重：如果一个短词是某个长词的子串，且长词频次相同，优先保留长词
  const result: string[] = [];
  for (const word of sorted) {
    const isSubstring = result.some((r) => r.includes(word) && r !== word);
    if (!isSubstring) {
      result.push(word);
    }
    if (result.length >= maxCount) break;
  }

  return result;
}
