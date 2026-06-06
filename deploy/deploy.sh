#!/bin/bash
# ============================================
# HGL Blog — 一键部署 / 更新脚本
# 用法: bash deploy/deploy.sh
# ============================================
set -e

echo "🚀 HGL Blog 部署开始..."

# --- 加载生产环境变量 ---
if [ -f backend/.env.production ]; then
  set -a
  source backend/.env.production
  set +a
  echo "✅ 已加载 backend/.env.production"
elif [ -f backend/.env ]; then
  set -a
  source backend/.env
  set +a
  echo "⚠️  使用 backend/.env（建议改用 .env.production）"
else
  echo "❌ 未找到环境变量文件，请先创建 backend/.env.production"
  exit 1
fi

# --- 1. 拉取最新代码 ---
echo "📥 拉取最新代码..."
git pull origin main

# --- 2. 前端构建 ---
echo "📦 构建前端..."
cd frontend
npm ci --silent
npm run build
echo "📤 部署前端到 /var/www/blog..."
sudo mkdir -p /var/www/blog
sudo rm -rf /var/www/blog/*
sudo cp -r dist/* /var/www/blog/
cd ..

# --- 3. 后端构建 + 启动 ---
echo "🐳 构建并启动 Docker 容器..."
docker compose up -d --build backend

# --- 4. 数据库迁移 ---
echo "🗄️  运行数据库迁移..."
sleep 3  # 等 backend 容器完全启动
docker compose exec -T backend npx prisma migrate deploy || echo "⚠️  迁移可能已是最新"

# --- 5. 首次部署时播种数据 ---
if [ ! -f .seeded ]; then
  echo "🌱 首次部署，播种数据..."
  docker compose exec -T backend npx tsx prisma/seed.ts && touch .seeded
  echo "   ⚠️  默认管理员: admin / admin123 — 请立即修改密码！"
fi

# --- 6. 更新 Nginx 配置 + 重载 ---
echo "🔄 更新 Nginx..."
sudo cp deploy/nginx.conf /etc/nginx/sites-available/hglblog
sudo ln -sf /etc/nginx/sites-available/hglblog /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "✅ 部署完成！访问 https://hgl123.icu 查看"
