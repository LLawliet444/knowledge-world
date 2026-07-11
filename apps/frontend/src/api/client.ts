/**
 * API 客户端（原生 fetch + 本地 fallback）
 * 后端不可用时自动降级，保证开发期可演示
 */

// 开发环境：API 地址跟随当前页面 host，避免 localhost/127.0.0.1 混用导致 CORS 失败
// 生产环境：优先使用 VITE_API_BASE_URL（如反向代理到 /api）
function resolveApiBase(): string {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (import.meta.env.DEV) {
    // 开发环境：与页面同 host，避免 127.0.0.1 → localhost 的 CORS 跨源
    return `http://${window.location.hostname}:8001`;
  }
  // 生产环境：子路径部署，API 走 /knowledge-world/api/v1/...（由 nginx 反向代理到后端）
  // 注意：路径前缀只到子路径，/api/v1 由请求自身拼接
  return "/knowledge-world";
}

export const API_BASE = resolveApiBase();

// 标记后端是否可用（createSession 返回 sess_fallback 时置 false）
let _backendAvailable = true;

/** 后端是否可用（不可用时 UI 应提示用户） */
export function isBackendAvailable(): boolean {
  return _backendAvailable;
}

/** 标记后端不可用（apiFetch 网络失败时调用） */
export function _markBackendUnavailable(): void {
  _backendAvailable = false;
}

// 会话鉴权令牌（模块级，由 store 通过 setApiSessionToken 同步）
let _sessionToken: string | null = null;

/** 设置会话令牌（store 在 createSession / rehydrate 时调用） */
export function setApiSessionToken(token: string | null) {
  _sessionToken = token;
}

/** 获取会话令牌（供直接 fetch 的场景使用，如 getSessionStatus） */
export function getApiSessionToken(): string | null {
  return _sessionToken;
}

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
      headers: {
        "Content-Type": "application/json",
        ...(_sessionToken ? { "X-Session-Token": _sessionToken } : {}),
      },
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
      // HTTP 错误（如 4xx/5xx）已在上面打印过日志，后端本身在线
    } else {
      // 网络错误（DNS/CORS/连接失败）：后端不可用，标记并提醒用户
      console.error(`[apiFetch] ${method} ${path} → network error`, err);
      _markBackendUnavailable();
    }
    return fallback;
  }
}

export { apiFetch };
