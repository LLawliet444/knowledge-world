# 前端 Dockerfile — Knowledge World Frontend
# 多阶段构建：阶段1 用 Node 构建，阶段2 用 nginx 托管静态文件
# 注意：vite.config.ts 的 publicDir 指向 ../../assets，构建时需要项目根目录上下文

# ─── 阶段 1：构建前端 ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build

# 先复制 package.json + lockfile，利用 Docker 层缓存
COPY apps/frontend/package.json apps/frontend/package-lock.json ./

RUN npm ci

# 复制项目根目录（vite.config.ts 的 publicDir: "../../assets" 需要 assets 在根目录）
# 注意：Dockerfile 的构建上下文（context）必须设为项目根目录
COPY apps/frontend/ ./apps/frontend/
COPY assets/ ./assets/

# 构建（VITE_API_BASE_URL 设为空，前端走相对路径 /api/*，由 nginx 反代到后端）
WORKDIR /build/apps/frontend
RUN VITE_API_BASE_URL="" npm run build

# ─── 阶段 2：nginx 托管静态文件 ─────────────────────────────────
FROM nginx:alpine

# 复制自定义 nginx 配置
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=builder /build/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
