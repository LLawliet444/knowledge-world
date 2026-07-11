# 后端 Dockerfile — Knowledge World API
# 基于 python:3.12-slim，多阶段构建分离依赖安装与运行时

# ─── 阶段 1：安装依赖 ───────────────────────────────────────────
FROM python:3.12-slim AS builder

# 安装编译依赖（部分 Python 包需要 gcc）
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# 先复制 requirements 单独安装，利用 Docker 层缓存
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ─── 阶段 2：运行时镜像 ─────────────────────────────────────────
FROM python:3.12-slim

# 从 builder 复制已安装的 Python 依赖
COPY --from=builder /root/.local /root/.local

# 安装 gunicorn（生产环境多进程管理）
RUN pip install --no-cache-dir gunicorn

WORKDIR /app

# 只复制运行所需文件，避免 .env / logs / __pycache__ 等进入镜像
# .dockerignore 会进一步排除敏感文件（双保险）
COPY main.py ./
COPY app/ ./app/
COPY requirements.txt ./

# 确保日志目录存在
RUN mkdir -p /app/logs

# 环境变量默认值（可被 docker-compose / .env 覆盖）
ENV PYTHONUNBUFFERED=1 \
    TZ=Asia/Shanghai \
    APP_ENV=production

# 暴露端口
EXPOSE 8001

# 生产环境用 gunicorn + uvicorn worker（2 worker 对应 2 核）
# --worker-tmp-dir /dev/shm：用内存文件系统避免磁盘 IO 瓶颈
# --preload：共享应用代码，减少内存占用
CMD ["gunicorn", "main:app", \
     "-w", "2", \
     "-k", "uvicorn.workers.UvicornWorker", \
     "-b", "0.0.0.0:8001", \
     "--worker-tmp-dir", "/dev/shm", \
     "--preload", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
