#!/bin/bash
# HGL Blog 一键部署脚本
# 用法: bash deploy/deploy.sh
set -e

echo "🚀 HGL Blog 部署开始..."

# 加载环境变量
if [ -f backend/.env ]; then
    export $(grep -v '^#' backend/.env | xargs)
fi

# === 1. 前端构建上传 ===
echo "📦 构建前端..."
cd frontend
npm ci --silent
npm run build
echo "📤 上传前端到 /var/www/blog..."
sudo mkdir -p /var/www/blog
sudo cp -r dist/* /var/www/blog/
cd ..

# === 2. 后端构建启动 ===
echo "🐳 启动 Docker 服务..."
docker compose up -d --build backend

# === 3. 数据库迁移 ===
echo "🗄 运行数据库迁移..."
docker compose exec -T backend npx prisma migrate deploy

# === 4. 重载 Nginx ===
echo "🔄 重载 Nginx..."
sudo cp deploy/nginx.conf /etc/nginx/sites-available/hglblog
sudo ln -sf /etc/nginx/sites-available/hglblog /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo "✅ 部署完成！访问 https://hgl123.icu 查看"
