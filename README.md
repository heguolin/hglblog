# 🌸 HGL Blog — 二次元毛玻璃风格个人博客

基于 **Vue 3 + NestJS** 的全栈个人博客系统。极致毛玻璃（Glassmorphism）+ Bento Grid 布局 + 二次元视觉特效，支持文章/杂谈/照片墙/友链/管理后台。

> 在线地址：[https://hgl123.icu](https://hgl123.icu)

---

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3（Composition API）+ Vite + Tailwind CSS v4 + GSAP + Vue Router 4 + Pinia + Axios |
| 后端 | NestJS + Prisma ORM + PostgreSQL 16 + JWT 认证 |
| 运行时 | Node.js 22 LTS (v22.21.0) |
| 容器化 | Docker Compose（PostgreSQL + Redis + NestJS） |
| SSL | Let's Encrypt (Certbot) |

## 项目结构

```
hglblog/
├── frontend/                    # Vue 3 前端
│   ├── src/
│   │   ├── api/                 # Axios 封装 + 各模块请求
│   │   ├── components/
│   │   │   ├── layout/          # Background / DanmakuBg / Sidebar / Footer
│   │   │   ├── home/            # 首页 Bento 卡片组件 (8 个) + FriendCard / ChatterCard
│   │   │   ├── common/          # LazyImage（懒加载+blur-up+缩略图）/ CommentWidget
│   │   │   └── admin/           # 后台布局
│   │   ├── composables/         # useGsap / useSakura / useCursorGlow / useSEO
│   │   ├── router/              # 前台路由 + /admin/* 后台路由
│   │   ├── stores/              # auth store + app state
│   │   └── views/               # 前台页面 + admin/ 后台页面
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                     # NestJS 后端
│   ├── prisma/
│   │   ├── schema.prisma        # 数据模型 (10 张表)
│   │   └── seed.ts              # 种子数据 (3 分类 / 10 标签 / 10 文章 / 4 杂谈 / 2 相册)
│   ├── src/
│   │   ├── prisma/              # 全局 PrismaModule
│   │   ├── auth/                # JWT 登录 + AuthGuard + RolesGuard
│   │   ├── posts/               # 文章 CRUD
│   │   ├── chatters/            # 杂谈 CRUD
│   │   ├── albums/ photos/      # 相册 + 照片
│   │   ├── friends/             # 友链
│   │   ├── site/                # 站点统计 + 配置 + 背景图 + 上传
│   │   ├── upload/              # 图片上图中转
│   │   ├── categories/ tags/    # 分类 + 标签
│   │   └── app.module.ts / main.ts
│   └── package.json
│
├── docker-compose.yml           # PostgreSQL + Redis + Backend
├── CLAUDE.md                    # 项目开发约束文件
├── 二次元毛玻璃博客开发指南.md    # 完整设计文档
└── README.md
```

## 核心功能

### 前台（游客可访问）

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 Bento Grid | `/` | 8 张毛玻璃卡片网格（个人信息/音乐/最新文章/照片入口/杂谈/主题/系统信息），GSAP 滚动渐入 |
| 文章归档 | `/archive` | 带封面图的文章卡片网格、分类/标签下拉筛选、实时搜索、分页 |
| 文章详情 | `/posts/:slug` | Markdown 渲染 + highlight.js 代码高亮、悬浮 TOC 目录、上下篇导航、Waline 评论 |
| 云端杂谈 | `/chatter` | 沉浸式毛玻璃卡片网格、心情徽章、标签筛选、胶囊搜索框、入场动画 |
| 杂谈详情 | `/chatter/:id` | 心情 emoji + 多图画廊 + 灯箱浏览 |
| 光影画廊 | `/photowall` | 多图堆叠预览相册卡片、照片网格 + 灯箱（键盘/手势/页码） |
| 关于我 | `/about` | Banner 横幅 + 圆形头像 + 分段切换（自我介绍/研究动态）+ 毛玻璃正文 + Waline 评论 |
| 云端引力 | `/friends` | 友链卡片网格 + Online 状态徽章 + 一键复制友链格式 + 申请表单 |
| 404 | `/*` | 渐变色 404 + 随机趣味文案 + 返回首页 |

### 后台（需 ADMIN 登录）

| 页面 | 路由 | 说明 |
|------|------|------|
| 登录 | `/admin/login` | 毛玻璃登录卡片、已登录自动跳转 Dashboard |
| 仪表盘 | `/admin/dashboard` | 统计概览（文章/杂谈/照片/浏览量）+ 最近文章 + 快捷入口 |
| 文章管理 | `/admin/posts` | 文章列表表格、搜索、发布/置顶切换、删除 |
| 写文章 | `/admin/posts/new` | Markdown 编辑器（textarea + 实时预览）+ 封面图/分类/标签/摘要/发布 |
| 编辑文章 | `/admin/posts/edit/:id` | 同上，加载已有数据 |
| 杂谈管理 | `/admin/chatters` | 杂谈列表 + 新建弹窗（心情 emoji 选择 + 标签） |
| 相册管理 | `/admin/albums` | 新建相册 + 照片管理（粘贴 URL 或本地上传）+ 照片网格 |
| 友链管理 | `/admin/friends` | 待审核/已通过 Tab + 通过/拒绝按钮 + 手动添加 |
| 站点设置 | `/admin/settings` | 头像 URL、博主信息、弹幕文字管理、修改密码 |

## 视觉效果

- **背景**：深色渐变 `#0f0c29 → #302b63 → #24243e → #1a1a2e` + 4 个浮动模糊光球
- **动态背景**：图床图片轮播（8 秒切换、1.2s 淡入淡出）+ 半透明暗色遮罩
- **弹幕**：12 行半透明文字从右到左 CSS 横向滚动
- **樱花**：定时创建 🌸 DOM + CSS 下落动画
- **鼠标光晕**：requestAnimationFrame 平滑跟随粉色光球
- **毛玻璃**：`backdrop-filter: blur(20px) saturate(180%)`，标准/加强两层
- **强调色**：粉 `#ff6b9d` / 紫 `#c084fc` / 蓝 `#60a5fa` / 青 `#22d3ee`
- **GSAP 动效**：卡片滚动淡入上浮、3D 倾斜、stagger 错峰入场
- **图片懒加载**：LazyImage 组件 — IntersectionObserver 懒加载 + CSS blur-up 渐入过渡（模糊→清晰）+ aspect-ratio 防 CLS
- **图片缩略图**：Nginx image_filter 动态缩放，原图 7.7MB → 缩略图 ~150KB（50 倍压缩）

## 快速开始

### 环境要求

- Node.js 22 LTS (v22.21.0)
- Docker Desktop（运行 PostgreSQL 16 + Redis 7）
- npm 10.x

### 本地开发

```bash
# 1. 克隆项目
git clone <repo-url>
cd hglblog

# 2. 启动数据库
docker compose up -d postgres

# 3. 后端
cd backend
cp .env.example .env   # 编辑 .env 填入数据库密码和 JWT 密钥
npm install
npx prisma migrate dev
npx tsx prisma/seed.ts  # 播种测试数据（默认管理员 admin/admin123）
npm run start:dev        # http://localhost:4000

# 4. 前端（新终端）
cd frontend
npm install
npm run dev              # http://localhost:3000
```

### 快速命令

| 命令 | 说明 |
|------|------|
| `npm run start:dev` | 后端开发模式（热重载） |
| `npm run build` | 后端 / 前端生产构建 |
| `npx prisma studio` | 数据库 GUI 管理 |
| `npx tsx prisma/seed.ts` | 重新播种测试数据 |
| `npx prisma migrate dev` | 数据库迁移 |

## API 接口

### 公开接口

```
GET  /api/health
GET  /api/posts(?page,limit,category,tag)
GET  /api/posts/recent(?limit)
GET  /api/posts/:slug                         # viewCount++
GET  /api/categories
GET  /api/tags
GET  /api/chatters(?tag)
GET  /api/chatters/:id
GET  /api/albums
GET  /api/albums/:id                          # 含 photos
GET  /api/friends                             # 仅 approved
GET  /api/site/stats
GET  /api/site/config/:key
GET  /api/site/background-images              # 动态背景图片列表
POST /api/friends/apply                       # 友链申请（公开）
POST /api/auth/login                          # 登录
```

### 需 ADMIN 认证（AuthGuard + RolesGuard）

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
POST   /api/upload                             # 图片上图中转
PUT    /api/friends/:id                        # 审核友链
DELETE /api/friends/:id
PUT    /api/site/config/:key
GET    /api/friends/admin                      # 查看全部（含待审核）
PUT    /api/auth/profile                       # 更新管理员头像
```

## 数据库模型

| 表 | 说明 |
|----|------|
| User | 管理员用户（username / password(bcrypt) / avatar / role） |
| Post | 文章（title / slug / content(Markdown) / excerpt / coverImage / published / pinned / viewCount / category / tags） |
| Category | 分类（name / slug / icon / color） |
| Tag | 标签（name / slug / color） |
| Chatter | 杂谈（title / content / mood(emoji) / images / tags） |
| Album | 相册（name / description / coverImage / photos[]） |
| Photo | 照片（url / thumbnail / title） |
| Friend | 友链（name / url / avatar / description / approved） |
| SiteConfig | 站点配置（key-value，支持 avatar / bio / danmaku_texts 等） |

## 图片管理

所有图片统一存储在外部图床 `img.hgl123.icu`（同服务器、PM2 托管、Nginx 反代）：
- 后台上传：前端选文件 → POST `/api/upload`（后端中转，token 只存服务器 `.env`） → 转发图床 `POST /api/upload` → 返回 URL 存入数据库
- 博客服务器不存储任何图片文件，只存 URL
- **缩略图**：Nginx `image_filter` 模块动态缩放，URL 格式 `https://img.hgl123.icu/thumb/<文件名>?w=<宽度>`。前端 LazyImage 组件通过 `thumbWidth` prop 自动生成缩略图 URL，无需手动拼接
- **动态背景**：后端缓存 10 分钟，优先缩略图（30KB WebP），降级回深色渐变 + 光球
- 图床 Nginx 配置文件：`deploy/image-host-nginx.conf`

### 图片环境变量（在项目根目录创建 `.env`，Docker Compose 自动读取）

```env
IMG_UPLOAD_TOKEN=xxx    # 图床上传 Token
IMG_USERNAME=xxx        # 图床登录用户名
IMG_PASSWORD=xxx        # 图床登录密码
```

> Docker Compose 读取 `docker-compose.yml` 同级目录的 `.env`，不是 `backend/.env`。

## 权限模型

| 角色 | 权限 |
|------|------|
| 游客 | 浏览所有页面、查看文章/杂谈/照片/友链、申请友链 |
| 博主 (ADMIN) | 以上全部 + 登录 `/admin` 后台、发布/编辑/删除文章、发杂谈、管理相册照片、审核友链、修改站点配置 |

技术实现：所有 GET 接口公开；所有 POST/PUT/DELETE 加 `AuthGuard('jwt') + RolesGuard + @Roles('ADMIN')`；JWT token 存 localStorage；Axios 拦截器自动带 `Authorization: Bearer <token>`；401 时清 token 跳登录页。

## 部署

### 首次部署

```bash
# 1. SSH 到服务器
ssh root@your-server-ip

# 2. 服务器初始化（安装 Docker / Nginx / Certbot / Node.js）
cd /opt && git clone https://github.com/heguolin/hglblog.git
cd hglblog
bash deploy/init-server.sh

# 3. 配置生产环境变量（在项目根目录创建 .env，不是 backend/.env）
cp backend/.env.production .env
nano .env
# 必须替换:
#   DB_PASSWORD         — 数据库密码
#   JWT_SECRET          — openssl rand -hex 32 生成
#   IMG_UPLOAD_TOKEN    — 图床 API Token
#   IMG_USERNAME        — 图床登录名
#   IMG_PASSWORD        — 图床登录密码

# 4. 一键部署
bash deploy/deploy.sh

# 5. 部署图床 Nginx 配置（含缩略图 endpoint）
cp deploy/image-host-nginx.conf /etc/nginx/conf.d/image-host.conf
mkdir -p /var/cache/nginx/thumbs && chown nginx:nginx /var/cache/nginx/thumbs
nginx -t && nginx -s reload

# 6. 申请 SSL 证书
sudo certbot --nginx -d hgl123.icu
sudo certbot --nginx -d img.hgl123.icu

# 7. 登录后台改密码
# https://hgl123.icu/admin/login  默认 admin / admin123
```

### 更新部署

```bash
cd /opt/hglblog
git pull origin main
bash deploy/deploy.sh

# 图床 Nginx 配置有变更时，同步更新
cp deploy/image-host-nginx.conf /etc/nginx/conf.d/image-host.conf
nginx -t && nginx -s reload
```

### 日常维护

```bash
docker compose logs -f backend          # 查看后端日志
docker compose restart backend           # 重启后端
docker compose exec backend npx prisma studio  # 数据库 GUI
docker compose exec postgres pg_dump -U postgres blog > backup.sql  # 备份数据库
docker compose exec -T postgres psql -U postgres blog < backup.sql  # 还原数据库
sudo certbot renew --dry-run             # 测试 SSL 续期
```

## 许可证

MIT License
