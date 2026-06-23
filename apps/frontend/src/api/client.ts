/**
 * API 客户端（原生 fetch + 本地 fallback）
 * 后端不可用时自动降级，保证开发期可演示
 */

export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8001";

async function apiFetch<T>(
  path: string,
  body: unknown,
  fallback: T,
  timeoutMs = 6000,
  method: "GET" | "POST" = "POST",
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(`[apiFetch] ${method} ${path} → HTTP ${res.status}`, errBody);
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.message.startsWith("HTTP")) {
      // 已在上面打印过日志
    } else {
      console.error(`[apiFetch] ${method} ${path} → network error`, err);
    }
    return fallback;
  }
}

export { apiFetch };
