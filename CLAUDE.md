# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

你正在开发一个二次元毛玻璃风格的个人博客全栈项目。

## 项目信息

- 原型参考：https://www.xinghuisama.top/（极致毛玻璃 + Bento Grid 布局）
- 完整设计文档：`二次元毛玻璃博客开发指南 .md`（文件名 `.md` 前有空格）
- 博客域名：`hgl123.icu`，图床域名：`img.hgl123.icu`
- 部署方式：前后端全部署在同一台 Linux 服务器，Nginx 统一入口（`/` 静态前端，`/api/` 反代后端）
- 设计系统：`DESIGN.md` —— 所有视觉/UI 决策必须先读它，QA 模式下偏离 DESIGN.md 的代码视为缺陷

## 技术栈

- 前端：Vue 3 + Vite + Tailwind CSS v4 + GSAP + Vue Router 4 + Pinia + Axios + PixiJS v6 + pixi-live2d-display
- 后端：NestJS + Prisma + PostgreSQL 16 + JWT + NeteaseCloudMusicApi
- RAG 服务：Python 3.12+ + FastAPI + sentence-transformers (BGE-small-zh) + Milvus
- AI 模型：Qwen3-0.6B（QLoRA 微调，跑在宿主机 :8001，非 Docker）
- 运行时：Node.js 22 LTS，Python 3.12+
- 容器化：Docker Compose（PostgreSQL + Redis + NestJS + Milvus + RAG 服务）
- SSL：Certbot (Let's Encrypt)

## 常用命令

| 命令 | 目录 | 说明 |
|------|------|------|
| `npm run dev` | frontend/ | Vite 开发服务器 :3000 |
| `npm run build` | frontend/ | 前端生产构建 |
| `npm run start:dev` | backend/ | NestJS 热重载 :4000 |
| `npm run build` | backend/ | 后端生产构建 |
| `npm run test` | backend/ | Jest 单元测试 |
| `npm run lint` | backend/ | ESLint 检查 |
| `npx prisma migrate dev` | backend/ | 数据库迁移 → 再 `npx prisma generate` |
| `npx prisma studio` | backend/ | 数据库 GUI |
| `npx tsx prisma/seed.ts` | backend/ | 播种测试数据（默认管理员 admin/admin123） |
| `docker compose up -d` | 项目根 | 启动全部服务（PG + Redis + NestJS + Milvus + RAG） |
| `docker compose up -d --build` | 项目根 | 重建并启动全部 |
| `python -m pytest tests/ -v` | rag-service/ | RAG 单元测试（20 个） |
| `python -m pytest tests/ -v -m integration` | rag-service/ | RAG 集成测试（需完整环境） |
| `python -m ingestion.indexer --full` | rag-service/ | 全量入库 → Milvus |
| `python -m ingestion.indexer --source-type post --source-id 5` | rag-service/ | 增量更新单条 |

## 编码约束

### 前端
- 所有组件必须使用 `<script setup lang="ts">`，禁止 Options API；文件名 PascalCase，composable 以 `use` 开头
- props/emits 必须有 TS 类型；CSS 优先 Tailwind 工具类，复杂动画/伪元素用 `<style scoped>`
- 路由全部懒加载：`component: () => import("@/views/Xxx.vue")`
- Tailwind v4 入口：`@import "tailwindcss"`，自定义色系用 `@theme {}`

### 后端
- 每个业务模块独立目录（module / controller / service / dto），注册到 `app.module.ts` 的 `imports`
- DTO 必须 class-validator 校验；Controller 纯路由，逻辑放 Service；所有路由前缀 `/api`
- 错误用 NestJS 内置异常（NotFoundException 等），禁止裸抛
- 所有写操作接口加 `@UseGuards(AuthGuard, RolesGuard)` + `@Roles('ADMIN')`

### Python RAG 服务
- 代码放在 `rag-service/`，Python 双引号，2 空格缩进
- Embedding 模型（BGE-small-zh ~100MB）启动时加载一次，常驻内存，禁止重复实例化
- 对外接口格式必须与 OpenAI `/v1/chat/completions` 兼容（前端不改一行）
- 所有异常必须降级不中断：Milvus 不可用→跳过检索直调模型，模型超时→返回流萤语气 fallback
- 必须使用 Python `logging` 模块（非 `print`），记录请求耗时/检索分数/错误类型

### 通用
- TypeScript strict 模式，禁止 `any`（除非加注释说明）；异步用 async/await
- 字符串双引号，缩进 2 空格

## 权限模型

- 游客：浏览 + 申请友链；博主（role=ADMIN，JWT）：`/admin` 管理所有内容
- JWT token 存 localStorage，Axios 拦截器自动附加，401 时清除 token 跳转登录
- `seed.ts` 创建默认管理员（密码 bcrypt），部署后第一件事改密码

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
| proxy | `src/proxy/` | 网易云 CDN 音频/图片代理（SSRF 白名单，非 AI 聊天） |
| system | `src/system/` | 服务器系统信息 |
| prisma | `src/prisma/` | 全局 PrismaModule + PrismaService |
| rag | `src/rag/` | RAG 增量索引 Webhook（文章/杂谈变更时通知 Python 服务） |

## RAG 系统

流萤看板娘的知识增强检索系统，位于 Nginx 和模型之间：`Nginx → Python RAG (:8002) → Qwen3-0.6B (:8001)`

- **知识库**：Milvus Standalone（嵌入式 etcd + MinIO），`blog_knowledge` collection，IVF_FLAT + COSINE
- **入库管线**：`rag-service/ingestion/indexer.py` — PG 读取 posts/chatters → 分块（512/64 overlap）→ BGE 向量化 → Milvus
- **增量同步**：NestJS RagService 在文章/杂谈 create/update/delete 后自动调 `POST /api/rag/reindex`
- **降级链**：Milvus 不可用→直调模型，检索为空→不注入上下文，模型超时→fallback 回复
- **回滚**：Nginx 改回 `proxy_pass http://127.0.0.1:8001` 即可绕过 RAG

Docker Compose 新增服务：`milvus`（mem_limit: 1g, :19530, healthcheck :9091）、`rag-service`（mem_limit: 512m, :8002）。Milvus 依赖 `milvus_data` 卷持久化。

## Live2D 看板娘系统

- 角色：流萤（崩坏：星穹铁道），Cubism 4 模型在 `frontend/public/live2d/`
- 渲染：PixiJS v6 + pixi-live2d-display（**仅走 cubism4 子路径** `import { Live2DModel } from "pixi-live2d-display/cubism4"`）
- **PixiJS 必须锁定 v6**：v7/v8 移除 EventEmitter，pixi-live2d-display 不兼容
- 加载顺序：`index.html` 中 `<script src="/live2d/live2dcubismcore.min.js">` 必须在 `<script type="module">` 之前同步加载；之后 `(window as any).PIXI = PIXI`
- 聊天接口：`POST /api/mascot/chat` → Nginx → RAG 服务 :8002 → 模型 :8001

## AI 模型

- 基座：Qwen3-0.6B（FP32 ~2.4GB），QLoRA + LLaMA-Factory 微调，部署到 4C4G CPU 服务器 :8001
- 数据集：`scripts/v2/firefly_self_cognition.json`（239 条）+ `firefly_dialogue.json`（1512 条，含 150 条多轮记忆）
- System Prompt：`scripts/v2/SYSTEM_PROMPT.txt`，LLaMA-Factory 的 `dataset_info.json` 中 `system` 字段注入
- 两轮训练：先 self_cognition（lr=5e-4, epochs=25），再 dialogue（lr=2e-4, epochs=10），对话数据每条保留短前缀防覆盖自我认知
- 反幻觉：negative examples 10 条 + System Prompt 硬性规则；评估：`scripts/eval_identity.py`（10 题，目标 10/10）
- **RAG 增强**：模型不再直接接收用户请求，由 Python RAG 服务注入检索到的博客知识后转发

## 常见陷阱

- 先用 mock 数据把 UI 做好，再接 API；图片全部走 img.hgl123.icu 图床，数据库只存 URL
- GSAP 使用前必须 `gsap.registerPlugin(ScrollTrigger)`
- `backdrop-filter` 叠加不超过 3 层；父元素 `overflow:hidden` / `transform` / `filter` 会导致 backdrop-filter 失效
- docker-compose 中所有服务端口绑 `127.0.0.1`，不暴露外网；Nginx 必须配 `try_files $uri $uri/ /index.html`
- Docker Compose 读取项目根目录 `.env`（不是 `backend/.env`）
- 图床数据也要备份，图床挂了博客图片全部裂开
- RAG 容器 mem_limit=512m，**严禁**多处实例化 BGE 模型（indexer 脚本和 lifespan 不能各开一个）
- RAG 回滚只需改 Nginx 一行：`proxy_pass http://127.0.0.1:8001/v1/chat/completions`

## 设计文档

- 设计规范：`DESIGN.md`（Warm Hearth x Glass，毛玻璃 token + 强调色）
- RAG 设计：`docs/superpowers/specs/2026-07-08-firefly-rag-design.md`
- RAG 实施计划：`docs/superpowers/plans/2026-07-08-firefly-rag-plan.md`

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → /office-hours | Strategy/scope → /plan-ceo-review
- Architecture → /plan-eng-review | Design system/review → /design-consultation or /plan-design-review
- Full review pipeline → /autoplan | Bugs/errors → /investigate
- QA/testing → /qa or /qa-only | Code review/diff → /review | Visual polish → /design-review
- Ship/deploy/PR → /ship or /land-and-deploy
- Save/resume context → /context-save / /context-restore | Spec → /spec
- **重要：所有 gstack skill 产出的文档正文必须使用中文，代码/命令/术语可用原文**
