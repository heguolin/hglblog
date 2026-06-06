#!/bin/bash
# ============================================
# HGL Blog — 服务器首次初始化脚本
# 适用: CentOS 9 / Ubuntu 20.04+
# 用法: bash deploy/init-server.sh
# ============================================
set -e

echo "🔧 HGL Blog 服务器初始化..."

# ---- 检测包管理器 ----
if command -v apt &> /dev/null; then
  PKG_MGR="apt"
elif command -v dnf &> /dev/null; then
  PKG_MGR="dnf"
elif command -v yum &> /dev/null; then
  PKG_MGR="yum"
else
  echo "❌ 未检测到 apt/dnf/yum，请手动安装依赖"
  exit 1
fi
echo "📦 包管理器: $PKG_MGR"

# ---- 1. 安装基础工具 ----
echo "📥 安装 Git / curl / openssl..."
if [ "$PKG_MGR" = "apt" ]; then
  sudo apt update
  sudo apt install -y git curl openssl
else
  sudo $PKG_MGR install -y git curl openssl
fi

# ---- 2. 安装 Docker（如未安装） ----
if ! command -v docker &> /dev/null; then
  echo "🐳 安装 Docker..."
  curl -fsSL https://get.docker.com | sudo bash
  sudo systemctl enable docker
  sudo systemctl start docker
else
  echo "✅ Docker 已安装: $(docker --version)"
fi

# ---- 3. 安装 Docker Compose（如未安装） ----
if ! docker compose version &> /dev/null; then
  echo "🐳 安装 Docker Compose 插件..."
  if [ "$PKG_MGR" = "apt" ]; then
    sudo apt install -y docker-compose-plugin
  else
    sudo $PKG_MGR install -y docker-compose-plugin
  fi
else
  echo "✅ Docker Compose 已安装"
fi

# ---- 4. 安装 Nginx（如未安装） ----
if ! command -v nginx &> /dev/null; then
  echo "🌐 安装 Nginx..."
  if [ "$PKG_MGR" = "apt" ]; then
    sudo apt install -y nginx
  else
    sudo $PKG_MGR install -y nginx
  fi
  sudo systemctl enable nginx
  sudo systemctl start nginx
else
  echo "✅ Nginx 已安装: $(nginx -v 2>&1)"
fi

# ---- 5. 安装 Certbot（如未安装） ----
if ! command -v certbot &> /dev/null; then
  echo "🔒 安装 Certbot..."
  if [ "$PKG_MGR" = "apt" ]; then
    sudo apt install -y certbot python3-certbot-nginx
  else
    sudo $PKG_MGR install -y certbot python3-certbot-nginx
  fi
else
  echo "✅ Certbot 已安装"
fi

# ---- 6. 安装 Node.js 22（如未安装） ----
if ! command -v node &> /dev/null || ! node -v | grep -q "v22"; then
  echo "📦 安装 Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt install -y nodejs
else
  echo "✅ Node.js: $(node -v)"
fi

# ---- 7. 创建项目目录 ----
echo "📁 创建项目目录..."
sudo mkdir -p /opt /var/www/blog
sudo chown -R $USER:$USER /opt /var/www/blog

# ---- 8. 配置防火墙 ----
echo "🔥 配置防火墙..."
if command -v ufw &> /dev/null; then
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw --force enable
  echo "✅ UFW 已配置 (22/80/443)"
elif command -v firewall-cmd &> /dev/null; then
  sudo firewall-cmd --permanent --add-service=ssh
  sudo firewall-cmd --permanent --add-service=http
  sudo firewall-cmd --permanent --add-service=https
  sudo firewall-cmd --reload
  echo "✅ firewalld 已配置 (22/80/443)"
fi

# ---- 9. 克隆项目 ----
if [ ! -d /opt/hglblog ]; then
  echo "📥 克隆项目..."
  cd /opt
  git clone https://github.com/heguolin/hglblog.git
  cd hglblog
else
  echo "✅ 项目已存在于 /opt/hglblog"
fi

echo ""
echo "============================================"
echo "✅ 服务器初始化完成！"
echo ""
echo "下一步:"
echo "1. cd /opt/hglblog"
echo "2. cp backend/.env.production backend/.env"
echo "3. 编辑 backend/.env 填入真实密码和密钥"
echo "4. bash deploy/deploy.sh"
echo "5. sudo certbot --nginx -d hgl123.icu"
echo "============================================"
