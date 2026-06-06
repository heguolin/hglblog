# CLAUDE.md

你正在开发一个二次元毛玻璃风格的个人博客全栈项目。

## 项目信息

- 原型参考：https://www.xinghuisama.top/（极致毛玻璃 + Bento Grid 布局）
- 完整设计文档：`二次元毛玻璃博客开发指南.md`（包含原型站分析、视觉特效实现方式、数据库字段定义、API 详细设计、Nginx 配置模板、Docker 部署配置等，执行各阶段时务必参考）
- 博客域名：`hgl123.icu`
- 图床域名：`img.hgl123.icu`（已独立部署运行，博客所有图片上传到此图床，数据库只存返回的 URL）
- 部署方式：前后端全部署在同一台 Linux 服务器，Nginx 统一入口（`/` 静态前端，`/api/` 反代后端）

## 技术栈约束

- 前端：Vue 3 + Vite + Tailwind CSS v4 + GSAP + Vue Router 4 + Pinia + Axios
- 后端：NestJS + Prisma + PostgreSQL 16 + JWT
- 运行时：Node.js 22 LTS (v22.21.0)
- 容器化：Docker Compose（PostgreSQL + Redis + NestJS 后端）
- SSL：Certbot (Let's Encrypt)

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
- Prisma 修改 schema 后必须执行 `npx prisma migrate dev` 再 `npx prisma generate`
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
- 管理后台：同样深色毛玻璃风格但更简洁，侧重功能可用性
- `backdrop-filter` 叠加不超过 3 层；父元素的 `overflow:hidden` / `transform` / `filter` 会导致 `backdrop-filter` 失效

## 权限模型

- 游客（未登录）：只能浏览页面 + 申请友链
- 博主（role=ADMIN，JWT 登录）：通过 `/admin` 后台管理所有内容
- JWT token 存 localStorage，Axios 请求拦截器自动附加 `Authorization: Bearer <token>`，响应 401 时清除 token 并跳转登录页
- `seed.ts` 必须创建默认管理员账号（密码 bcrypt 哈希），部署后第一件事登录改密码

## 首页 Bento 布局（grid-cols-12）

```
ProfileCard(col-5)  | MusicCard(col-7) + StatCards(col-7, 3 等分)
LatestPostCard(col-7) | PhotoEntryCard(col-5)
EmojiWidget(col-3)  | LatestChatterCard(col-9)
ThemeCard(col-3)    | SystemInfoCard(col-9)
平板 grid-cols-6 / 手机 grid-cols-1
```

## 开发阶段

项目分为 11 个阶段，严格按序推进。当我说"开始阶段 X"时，请参照下方描述和 `二次元毛玻璃博客开发指南.md` 中对应章节执行。每个阶段末尾的 ✅ 是验收标准，完成后需满足。

1. **项目初始化** — 创建前后端项目、安装全部依赖、配置 Vite/Tailwind/路由/Pinia/Axios、编写 schema.prisma、docker-compose、PrismaModule、/api/health。✅ 前端 :3000 显示页面，/api/health 返回数据。

2. **全局氛围层** — Background(渐变+光球)、DanmakuBg(弹幕)、Sidebar(打字机+导航)、Footer、useSakura(樱花)、useCursorGlow(光晕)、useGsap(ScrollTrigger)、App.vue(全局层+转场)。✅ 背景+光球+弹幕+樱花+导航+光晕全部可见。

3. **首页 Bento Grid** — 8 个卡片组件 + Home.vue 用 grid-cols-12 拼网格，数据先 mock。✅ 完整卡片+响应式+交互动画。

4. **后端 API + 认证** — auth 模块(登录/JWT/Guard/Roles)、seed 默认管理员、全部业务模块 CRUD(posts/chatters/albums+photos/friends/site/categories+tags)。✅ GET 公开，写操作需 ADMIN token。

5. **文章系统** — api 封装、首页卡片接 API、Archive 归档页、PostDetail 详情页(Markdown+高亮+TOC+上下篇)。✅ 文章全流程。

6. **杂谈系统** — Chatter 列表页(标签筛选)、ChatterDetail、首页卡片接 API。✅ 展示+筛选正常。

7. **照片墙** — PhotoWall 相册网格、Lightbox 灯箱、首页卡片接 API。✅ 灯箱完善。

8. **其余页面** — About、Friends、NotFound。✅ 无空白页。

9. **管理后台** — /admin 路由(需登录)：Login(JWT)、Dashboard(统计)、PostEdit(Markdown 编辑器+图片上传到 img.hgl123.icu)、Chatters 管理、Albums+照片管理(图床上传)、Friends 审核、Settings(博主信息+弹幕+改密码)。AdminLayout 左侧菜单+右侧内容。路由守卫 beforeEach 拦截未登录。✅ 博主可发文章/杂谈/管理照片/审核友链/改配置，游客被拦截。

10. **打磨优化** — GSAP 增强、响应式检查(320~1440px)、性能优化(懒加载/降级/粒子控制)、SEO、评论系统(Gitalk/Waline)。✅ 全设备流畅。

11. **服务器部署** — 服务器装 Docker/Nginx/Certbot → 后端 Dockerfile(多阶段构建) → docker-compose(PG+Redis+Backend,端口仅绑 127.0.0.1) → 前端 build+上传 /var/www/blog/ → Nginx(SPA try_files + /api/ proxy + gzip + 缓存) → certbot SSL → docker compose up + migrate + seed → deploy.sh 一键更新脚本。详细配置模板见开发指南 §阶段十一。✅ https://hgl123.icu 可访问，/admin 可登录，HTTPS 正常。

## 常见陷阱提醒

- 先用 mock 数据把页面 UI 做好，再接 API
- 图片全部走 img.hgl123.icu 图床，不要存在博客仓库或服务器本地
- GSAP 使用前必须 `gsap.registerPlugin(ScrollTrigger)`
- docker-compose 中 PG/Redis 不暴露外网端口，后端端口绑 `127.0.0.1:4000:4000`
- Nginx 必须配 `try_files $uri $uri/ /index.html` 支持 SPA 路由刷新
- 图床数据也需要备份，图床挂了博客图片会全部裂开
