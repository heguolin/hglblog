# 🌸 HGL Blog — 二次元毛玻璃风格个人博客

基于 **Vue 3 + NestJS + Python RAG** 的全栈个人博客系统。极致毛玻璃（Glassmorphism）+ Bento Grid 布局 + 二次元视觉特效 + 流萤 AI 看板娘（支持知识库检索增强对话）。

> 在线地址：[https://hgl123.icu](https://hgl123.icu)

---

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3（Composition API）+ Vite + Tailwind CSS v4 + GSAP + Vue Router 4 + Pinia + Axios |
| 后端 | NestJS + Prisma ORM + PostgreSQL 16 + JWT 认证 |
| AI 对话 | Python FastAPI + Milvus 向量库 + BGE-small-zh 嵌入 + Qwen3-0.6B（QLoRA 微调） |
| 运行时 | Node.js 22 LTS, Python 3.12+ |
| 容器化 | Docker Compose（PostgreSQL + Redis + NestJS + Milvus + RAG 服务） |
| SSL | Let's Encrypt (Certbot) |

## 项目结构

```
hglblog/
├── frontend/                     # Vue 3 前端
│   ├── src/
│   │   ├── api/                  # Axios 封装 + 各模块请求
│   │   ├── components/
│   │   │   ├── layout/           # Background / DanmakuBg / Sidebar / Footer
│   │   │   ├── home/             # 首页 Bento 卡片组件 (8 个)
│   │   │   ├── common/           # LazyImage / CommentWidget / Mascot
│   │   │   └── admin/            # 后台布局
│   │   ├── composables/          # useGsap / useSakura / useCursorGlow / useSEO / useAudioPlayer
│   │   ├── router/               # 前台 + /admin/* 后台路由（懒加载）
│   │   ├── stores/               # auth store + app state
│   │   └── views/                # 前台页面 + admin/ 后台页面
│   └── public/live2d/            # 流萤 Live2D 模型文件 (Cubism 4)
│
├── backend/                      # NestJS 后端
│   ├── prisma/
│   │   ├── schema.prisma         # 数据模型 (10 张表)
│   │   └── seed.ts               # 种子数据
│   ├── src/
│   │   ├── auth/ posts/ chatters/ albums/ photos/ friends/
│   │   ├── categories/ tags/ comments/ site/ upload/ music/
│   │   ├── system/ proxy/ prisma/
│   │   ├── rag/                  # RAG 增量索引 Webhook
│   │   └── app.module.ts / main.ts
│   └── package.json
│
├── rag-service/                  # Python RAG 微服务
│   ├── main.py                   # FastAPI 入口 + lifespan + /health
│   ├── config.py                 # 环境变量配置
│   ├── api/chat.py               # POST /v1/chat/completions (OpenAI 兼容)
│   ├── services/                 # embedding / retriever / llm_client
│   ├── rag/pipeline.py           # 检索→注入→调用 编排
│   ├── ingestion/                # 文本分块 + PG → Milvus 入库脚本
│   ├── schemas/                  # Pydantic 请求/响应模型
│   ├── tests/                    # 20 单元测试 + 4 集成测试
│   └── Dockerfile
│
├── deploy/
│   ├── nginx.conf                # 博客 Nginx（含 RAG 路由）
│   ├── image-host-nginx.conf     # 图床 Nginx（含缩略图）
│   ├── init-server.sh            # 服务器初始化
│   └── deploy.sh                 # 一键部署
├── scripts/v2/                   # AI 模型训练数据集 + System Prompt
├── docker-compose.yml            # PG + Redis + NestJS + Milvus + RAG
├── DESIGN.md                     # 设计系统规范
├── CLAUDE.md                     # 项目开发约束
└── 二次元毛玻璃博客开发指南.md     # 完整设计文档
```

## 核心功能

### 前台（游客可访问）

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 Bento Grid | `/` | 8 张毛玻璃卡片网格、GSAP 滚动渐入、流萤 Live2D 看板娘悬浮 |
| 文章归档 | `/archive` | 带封面图的卡片网格、分类/标签筛选、实时搜索、分页 |
| 文章详情 | `/posts/:slug` | Markdown 渲染 + 代码高亮、悬浮 TOC、上下篇导航、评论 |
| 云端杂谈 | `/chatter` | 毛玻璃卡片网格、心情 badge、标签筛选、入场动画 |
| 杂谈详情 | `/chatter/:id` | 心情 emoji + 多图画廊 + 灯箱 |
| 光影画廊 | `/photowall` | 多图堆叠预览、照片网格 + 灯箱（键盘/手势/页码） |
| 关于我 | `/about` | Banner + 圆形头像 + 分段切换 + 毛玻璃正文 + 评论 |
| 云端引力 | `/friends` | 友链卡片网格 + Online 徽章 + 申请表单 |
| 404 | `/*` | 渐变色 404 + 随机趣味文案 |

### 流萤 AI 看板娘

- **Live2D 渲染**：PixiJS v6 + pixi-live2d-display，Cubism 4 模型
- **聊天**：点击看板娘打开对话框 → 发送消息 → RAG 检索博客知识 → Qwen3-0.6B 流萤角色模型回复
- **冒泡语录**：定时随机展示（"火萤的光芒虽然微弱…但我会一直亮着"）
- **知识增强**：检索博客文章/杂谈，流萤可以聊她"看到"的博客内容

### 后台（需 ADMIN 登录）

文章管理、Markdown 写作、杂谈管理、相册管理、友链审核、站点设置 —— 完整 CRUD 后台，路由守卫拦截。

## 视觉效果

- **背景**：深色渐变 `#0f0c29 → #302b63 → #24243e → #1a1a2e` + 4 个浮动模糊光球
- **动态背景**：图床图片轮播（8s 切换、1.2s 淡入）+ 半透明暗色遮罩
- **弹幕**：12 行半透明 CSS 横向滚动 | **樱花**：定时创建 DOM 下落动画
- **鼠标光晕**：requestAnimationFrame 平滑跟随粉色光球
- **毛玻璃**：`backdrop-filter: blur(20px) saturate(180%)`，标准/加强两层
- **强调色**：粉 `#ff6b9d` / 紫 `#c084fc` / 蓝 `#60a5fa` / 青 `#22d3ee`
- **GSAP 动效**：卡片滚动淡入上浮、stagger 错峰入场
- **图片懒加载**：LazyImage 组件 — IntersectionObserver + CSS blur-up + aspect-ratio 防 CLS
- **缩略图**：Nginx image_filter 动态缩放，原图 ~7.7MB → ~150KB（50× 压缩）

## 快速开始

### 环境要求

- Node.js 22 LTS、Python 3.12+、Docker Desktop、npm 10.x

### 本地开发

```bash
# 1. 克隆项目
git clone <repo-url> && cd hglblog

# 2. 启动基础设施（PG + Redis + Milvus）
docker compose up -d postgres milvus

# 3. 后端
cd backend
cp .env.example .env && nano .env   # 填入 DB_PASSWORD / JWT_SECRET
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts               # 默认管理员 admin/admin123
npm run start:dev                     # :4000

# 4. RAG 服务（新终端，需要 Python 3.12+）
cd rag-service
pip install -r requirements.txt       # 首次会下载 BGE-small-zh (~100MB)
python main.py                        # 开发模式直接启动，或:
# fastapi dev main.py --port 8002     # 热重载模式

# 5. 前端（新终端）
cd frontend
npm install
npm run dev                           # :3000

# 6. 模型服务（需要 Qwen3-0.6B 微调模型，另见文档）
# python serve_model.py --port 8001   # 如不需要 AI 聊天可跳过

# 7. 知识入库（首次部署）
cd rag-service
python -m ingestion.indexer --full    # 将已有文章/杂谈索引到 Milvus
```

### 快速命令

| 命令 | 目录 | 说明 |
|------|------|------|
| `npm run start:dev` | backend/ | NestJS 热重载 |
| `npm run build` | backend/ 或 frontend/ | 生产构建 |
| `npx prisma studio` | backend/ | 数据库 GUI |
| `npx tsx prisma/seed.ts` | backend/ | 重新播种 |
| `python -m pytest tests/ -v` | rag-service/ | RAG 单元测试 (20) |
| `python -m ingestion.indexer --full` | rag-service/ | 全量入库 |

## API 接口

### 公开接口

```
GET  /api/health
GET  /api/posts(?page,limit,category,tag)
GET  /api/posts/recent(?limit)
GET  /api/posts/:slug
GET  /api/categories
GET  /api/tags
GET  /api/chatters(?tag)
GET  /api/chatters/:id
GET  /api/albums
GET  /api/albums/:id
GET  /api/friends
GET  /api/site/stats
GET  /api/site/config/:key
GET  /api/site/background-images
POST /api/friends/apply
POST /api/auth/login
POST /api/mascot/chat                # 流萤 AI 聊天 → RAG 服务 → 模型
```

### 需 ADMIN 认证

```
POST   /api/posts
PUT    /api/posts/:id
DELETE /api/posts/:id
POST   /api/chatters
DELETE /api/chatters/:id
POST   /api/albums
PUT    /api/albums/:id
DELETE /api/albums/:id
POST   /api/photos
DELETE /api/photos/:id
POST   /api/upload
PUT    /api/friends/:id
DELETE /api/friends/:id
PUT    /api/site/config/:key
GET    /api/friends/admin
PUT    /api/auth/profile
```

## 数据库模型

| 表 | 说明 |
|----|------|
| User | 管理员（username / password(bcrypt) / avatar / role） |
| Post | 文章（title / slug / content(Markdown) / excerpt / coverImage / published / pinned / viewCount / category / tags） |
| Category | 分类（name / slug / icon / color） |
| Tag | 标签（name / slug / color） |
| Chatter | 杂谈（title / content / mood(emoji) / images / tags） |
| Album | 相册（name / description / coverImage / photos[]） |
| Photo | 照片（url / thumbnail / title） |
| Friend | 友链（name / url / avatar / description / approved） |
| SiteConfig | 站点配置（key-value，支持 avatar / bio / danmaku_texts） |

## 图片管理

所有图片存储在外部图床 `img.hgl123.icu`（同服务器、PM2 托管）：
- 后台上传 → POST `/api/upload`（token 存服务器 `.env`）→ 转发图床 → 返回 URL 存数据库
- 缩略图：`https://img.hgl123.icu/thumb/<文件名>?w=<宽度>`（Nginx image_filter）
- LazyImage 组件通过 `thumbWidth` prop 自动生成缩略图 URL，无需手动拼接
- 动态背景：缓存 10 分钟，优先缩略图（30KB WebP），降级回深色渐变+光球
- 图床 Nginx 配置：`deploy/image-host-nginx.conf`

```env
# 项目根目录 .env（Docker Compose 读取）
IMG_UPLOAD_TOKEN=xxx
IMG_USERNAME=xxx
IMG_PASSWORD=xxx
```

## 权限模型

| 角色 | 权限 |
|------|------|
| 游客 | 浏览所有页面、申请友链、与流萤 AI 聊天 |
| 博主 (ADMIN) | 以上全部 + 登录 `/admin` 后台、CRUD 所有内容、修改站点配置 |

GET 公开；POST/PUT/DELETE 加 `AuthGuard + RolesGuard + @Roles('ADMIN')`；JWT 存 localStorage，Axios 拦截器自动带 token，401 清 token 跳登录。

## RAG 知识库

流萤 AI 从博客内容中检索知识增强对话：

```
用户 → Nginx → Python RAG (:8002) → Qwen3-0.6B (:8001)
                   ↓
              Milvus (:19530) ← PostgreSQL（入库管线）
                   ↑
         NestJS Webhook（增量更新）
```

- **全量入库**：`python -m ingestion.indexer --full`
- **增量更新**：文章/杂谈发布时 NestJS 自动触发
- **回滚**：Nginx 改回 `proxy_pass http://127.0.0.1:8001` 绕过 RAG
- Docker：`docker compose up -d milvus rag-service`

## 部署

### 首次部署

```bash
# 1. SSH 到服务器
ssh root@your-server-ip

# 2. 初始化服务器
cd /opt && git clone https://github.com/heguolin/hglblog.git
cd hglblog
bash deploy/init-server.sh

# 3. 配置环境变量（项目根目录，不是 backend/.env）
cp backend/.env.production .env && nano .env
# 必须替换: DB_PASSWORD / JWT_SECRET / IMG_UPLOAD_TOKEN / IMG_USERNAME / IMG_PASSWORD

# 4. 一键部署（含 Milvus + RAG 服务）
bash deploy/deploy.sh

# 5. 部署图床 + 博客 Nginx
cp deploy/nginx.conf /etc/nginx/sites-available/hglblog
ln -sf /etc/nginx/sites-available/hglblog /etc/nginx/sites-enabled/
cp deploy/image-host-nginx.conf /etc/nginx/conf.d/image-host.conf
mkdir -p /var/cache/nginx/thumbs && chown nginx:nginx /var/cache/nginx/thumbs
nginx -t && nginx -s reload

# 6. SSL 证书
sudo certbot --nginx -d hgl123.icu
sudo certbot --nginx -d img.hgl123.icu

# 7. 首次知识入库（需先启动所有服务）
cd rag-service
pip install -r requirements.txt
python -m ingestion.indexer --full

# 8. 登录后台改密码 → https://hgl123.icu/admin/login  admin/admin123
```

### 更新部署

```bash
cd /opt/hglblog
git pull origin main
bash deploy/deploy.sh
# 图床 Nginx 变更时同步:
cp deploy/image-host-nginx.conf /etc/nginx/conf.d/image-host.conf
cp deploy/nginx.conf /etc/nginx/sites-available/hglblog
nginx -t && nginx -s reload
```

### 日常维护

```bash
docker compose logs -f backend          # 后端日志
docker compose logs -f rag-service      # RAG 日志
docker compose restart backend           # 重启后端
docker compose restart rag-service       # 重启 RAG
docker compose exec backend npx prisma studio  # 数据库 GUI
docker compose exec postgres pg_dump -U postgres blog > backup.sql
docker compose exec postgres pg_dump -U postgres blog > backup.sql  # 备份
sudo certbot renew --dry-run             # 测试 SSL 续期
```

## 许可证

MIT License
