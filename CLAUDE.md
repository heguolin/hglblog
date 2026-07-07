# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

你正在开发一个二次元毛玻璃风格的个人博客全栈项目。

## 项目信息

- 原型参考：https://www.xinghuisama.top/（极致毛玻璃 + Bento Grid 布局）
- 完整设计文档：`二次元毛玻璃博客开发指南 .md`（文件名 `.md` 前有空格）
- 博客域名：`hgl123.icu`，图床域名：`img.hgl123.icu`
- 部署方式：前后端全部署在同一台 Linux 服务器，Nginx 统一入口（`/` 静态前端，`/api/` 反代后端）

## 技术栈约束

- 前端：Vue 3 + Vite + Tailwind CSS v4 + GSAP + Vue Router 4 + Pinia + Axios + PixiJS v6 + pixi-live2d-display
- 后端：NestJS + Prisma + PostgreSQL 16 + JWT + NeteaseCloudMusicApi
- 运行时：Node.js 22 LTS (v22.21.0)
- 容器化：Docker Compose（PostgreSQL + Redis + NestJS 后端）
- SSL：Certbot (Let's Encrypt)

## 常用命令

| 命令 | 目录 | 说明 |
|------|------|------|
| `npm run dev` | frontend/ | Vite 开发服务器 :3000 |
| `npm run build` | frontend/ | 前端生产构建（vue-tsc + vite build） |
| `npm run start:dev` | backend/ | NestJS 热重载 :4000 |
| `npm run build` | backend/ | 后端生产构建 |
| `npm run test` | backend/ | Jest 单元测试 |
| `npm run lint` | backend/ | ESLint 检查 |
| `npx prisma migrate dev` | backend/ | 数据库迁移 → 再 `npx prisma generate` |
| `npx prisma studio` | backend/ | 数据库 GUI |
| `npx tsx prisma/seed.ts` | backend/ | 播种测试数据（默认管理员 admin/admin123） |
| `docker compose up -d` | 项目根 | 启动 PG + Redis |
| `docker compose up -d --build` | 项目根 | 重建并启动全部服务 |

## 编码约束

### 前端

- 所有组件必须使用 `<script setup lang="ts">`，禁止 Options API
- 组件文件名 PascalCase，composable 函数以 `use` 开头
- props 和 emits 必须有 TypeScript 类型定义
- CSS 优先用 Tailwind 工具类；复杂动画/伪元素用 `<style scoped>`
- 路由全部懒加载：`component: () => import("@/views/Xxx.vue")`
- Tailwind v4 入口：`@import "tailwindcss"`，自定义色系用 `@theme {}`，不需要 `tailwind.config.js`

### 后端

- 每个业务模块独立目录，包含 module / controller / service / dto
- DTO 必须使用 class-validator 装饰器做校验
- Controller 只接收参数和返回结果，业务逻辑全部放 Service
- 所有路由前缀 `/api`
- 错误处理使用 NestJS 内置异常（NotFoundException、BadRequestException 等）
- 所有写操作接口（POST/PUT/DELETE）必须加 `@UseGuards(AuthGuard, RolesGuard)` + `@Roles('ADMIN')`
- 新模块必须注册到 `app.module.ts` 的 `imports` 数组

### 通用

- TypeScript strict 模式，禁止使用 `any`（除非绝对必要并加注释）
- 异步操作使用 async/await
- 字符串使用双引号，缩进 2 空格

## 视觉约束

- 背景渐变：`#0f0c29 → #302b63 → #24243e → #1a1a2e`
- 强调色：粉 `#ff6b9d`、紫 `#c084fc`、蓝 `#60a5fa`、青 `#22d3ee`
- 文字色：`#fff` / `rgba(255,255,255,0.7)` / `rgba(255,255,255,0.4)`
- 标准毛玻璃类 `.glass`：`background: rgba(255,255,255,0.06); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(255,255,255,0.1);`
- 加强毛玻璃类 `.glass-strong`：bg 提到 0.1、blur 到 30px、加 inset 顶部高光
- 卡片交互：hover 时 `translateY(-4px)` + box-shadow 增强，transition `0.4s cubic-bezier(0.4,0,0.2,1)`，圆角 `1rem`，间距 `gap-5`
- `backdrop-filter` 叠加不超过 3 层；父元素的 `overflow:hidden` / `transform` / `filter` 会导致 `backdrop-filter` 失效

## 权限模型

- 游客（未登录）：只能浏览页面 + 申请友链
- 博主（role=ADMIN，JWT 登录）：通过 `/admin` 后台管理所有内容
- JWT token 存 localStorage，Axios 请求拦截器自动附加 `Authorization: Bearer <token>`，响应 401 时清除 token 并跳转登录页
- `seed.ts` 必须创建默认管理员账号（密码 bcrypt 哈希），部署后第一件事登录改密码

## 后端模块

| 模块 | 目录 | 说明 |
|------|------|------|
| auth | `src/auth/` | JWT 登录、AuthGuard、RolesGuard、Roles 装饰器 |
| posts | `src/posts/` | 文章 CRUD、slug 唯一 |
| chatters | `src/chatters/` | 杂谈 CRUD、心情 emoji、多图 |
| albums / photos | `src/albums/` `src/photos/` | 相册 + 照片 CRUD |
| categories / tags | `src/categories/` `src/tags/` | 分类 + 标签 |
| friends | `src/friends/` | 友链 CRUD + 审核 |
| comments | `src/comments/` | 文章评论（嵌套回复、审核状态） |
| site | `src/site/` | 站点统计、配置 KV、背景图 |
| upload | `src/upload/` | 图片上图中转（→ img.hgl123.icu） |
| music | `src/music/` | 网易云音乐搜索（NeteaseCloudMusicApi） |
| proxy | `src/proxy/` | 看板娘聊天转发（→ 模型 API） |
| system | `src/system/` | 服务器系统信息 |
| prisma | `src/prisma/` | 全局 PrismaModule + PrismaService |

## Live2D 看板娘系统

- 角色：流萤（崩坏：星穹铁道），Cubism 4 模型文件在 `frontend/public/live2d/`
- 渲染：PixiJS v6 + pixi-live2d-display（**仅走 cubism4 子路径** `import { Live2DModel } from "pixi-live2d-display/cubism4"`）
- **PixiJS 必须锁定 v6**：v7/v8 移除了 EventEmitter，pixi-live2d-display 不兼容
- 加载顺序：`index.html` 中 `<script src="/live2d/live2dcubismcore.min.js">` 必须在 `<script type="module">` 之前同步加载
- 全局变量：`(window as any).PIXI = PIXI` 在 import 之后立即设置
- 点击交互：需要 `model.interactive = true` + container `@click` 兜底
- 聊天对话框 API：POST `/api/mascot/chat`（→ proxy 模块 → 模型 API）
- 冒泡语录：随机展示，定时切换

## AI 模型训练

- 基座：Qwen3-0.6B（FP32 ~2.4GB），QLoRA + LLaMA-Factory 微调，部署到 4C4G CPU 服务器
- 数据集：`scripts/v2/firefly_self_cognition.json`（239 条）+ `firefly_dialogue.json`（1512 条，含 150 条多轮记忆 history 字段）
- System Prompt：`scripts/v2/SYSTEM_PROMPT.txt`，训练时通过 LLaMA-Factory 的 `dataset_info.json` 中 `system` 字段注入（放在 `columns` 同级）
- 两轮训练：先 self_cognition（lr=5e-4, epochs=25, batch=8, grad_accum=4），再 dialogue（lr=2e-4, epochs=10, batch=8, grad_accum=4）
- 对话数据每条保留短前缀 `"你是流萤，只能用流萤的身份说话。用她的语气、她的性格、她的经历来回应。"`，防止多轮训练覆盖自我认知
- 反幻觉：negative examples（"你是ChatGPT吗"/"你是什么AI模型"等 10 条）+ System Prompt 硬性规则
- 评估：`scripts/eval_identity.py`，10 道身份认知题，目标 10/10

## 音乐播放器

- MusicCard 组件：网易云歌曲搜索下拉框 → 选中后播放
- useAudioPlayer composable：播放状态管理、音量、播放列表
- 浏览器自动播放限制：`unlock()` 在用户首次手势时同步调用 `audio.play()` 解锁
- 竞态处理：`loadTrack()` 使用 requestId 防快速切换

## 图片懒加载与缩略图

- LazyImage 组件：IntersectionObserver 懒加载 + CSS blur-up 渐入 + aspect-ratio 防 CLS
- Nginx image_filter 动态缩略图：`https://img.hgl123.icu/thumb/<文件名>?w=<宽度>`
- 原图 ~7.7MB → 缩略图 ~150KB（约 50 倍），图床 Nginx 配置：`deploy/image-host-nginx.conf`

## 首页 Bento 布局（grid-cols-12）

```
ProfileCard(col-5)  | MusicCard(col-7) + StatCards(col-7, 3 等分)
LatestPostCard(col-7) | PhotoEntryCard(col-5)
EmojiWidget(col-3)  | LatestChatterCard(col-9)
ThemeCard(col-3)    | SystemInfoCard(col-9)
平板 grid-cols-6 / 手机 grid-cols-1
```

## 开发阶段

项目分为 11 个阶段，严格按序推进。当说"开始阶段 X"时，参照 `二次元毛玻璃博客开发指南 .md` 对应章节执行。

1. **项目初始化** ✅ 前端 :3000 显示页面，/api/health 返回数据
2. **全局氛围层** ✅ 背景+光球+弹幕+樱花+导航+光晕
3. **首页 Bento Grid** ✅ 8 个卡片 + 响应式 + GSAP 动画
4. **后端 API + 认证** ✅ GET 公开，写操作需 ADMIN token
5. **文章系统** ✅ 归档/详情/Markdown+高亮+TOC+上下篇
6. **杂谈系统** ✅ 列表+标签筛选+详情
7. **照片墙** ✅ 相册网格+灯箱
8. **其余页面** ✅ About / Friends / NotFound
9. **管理后台** ✅ 文章/杂谈/相册/友链/设置 CRUD，路由守卫拦截
10. **打磨优化** — GSAP 增强、响应式 320~1440px、懒加载、SEO、评论
11. **服务器部署** — Docker/Nginx/Certbot，deploy.sh 一键更新

## 常见陷阱

- 先用 mock 数据把 UI 做好，再接 API
- 图片全部走 img.hgl123.icu 图床，数据库只存 URL
- GSAP 使用前必须 `gsap.registerPlugin(ScrollTrigger)`
- PixiJS 锁定 v6，不可升级；Live2D 只用 cubism4 子路径，不导入主包
- live2dcubismcore.min.js 必须在 index.html 模块脚本之前同步加载
- docker-compose 中 PG/Redis 不暴露外网端口，后端端口绑 `127.0.0.1:4000:4000`
- Nginx 必须配 `try_files $uri $uri/ /index.html` 支持 SPA 路由刷新
- Docker Compose 读取项目根目录的 `.env`（不是 `backend/.env`）
- 图床数据也需要备份，图床挂了博客图片会全部裂开

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
- **重要：所有 gstack skill 产出的文档（设计文档、审查报告、QA 报告等）正文必须使用中文，代码/命令/术语可用原文**

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
