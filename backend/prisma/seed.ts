import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  console.log("🌱 开始播种种子数据...\n");

  // ========== 1. 管理员 ==========
  const adminPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      email: "admin@hgl123.icu",
      username: "admin",
      password: adminPassword,
      avatar: "https://picsum.photos/seed/admin/200/200",
      bio: "全栈开发者 · 二次元爱好者 · 博客主人",
      role: "ADMIN",
    },
  });
  console.log(`✅ 管理员: ${admin.username} (${admin.role})`);

  // ========== 2. 分类 ==========
  const categoryData = [
    { name: "前端开发", slug: "frontend", icon: "🎨", color: "#60a5fa" },
    { name: "后端开发", slug: "backend", icon: "⚙️", color: "#22d3ee" },
    { name: "生活随笔", slug: "life", icon: "🌸", color: "#ff6b9d" },
  ];
  const categories: Record<string, number> = {};
  for (const c of categoryData) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
    categories[c.slug] = cat.id;
  }
  console.log(`✅ 分类: ${categoryData.length} 个`);

  // ========== 3. 标签 ==========
  const tagData = [
    { name: "Vue 3", slug: "vue3", color: "#22d3ee" },
    { name: "NestJS", slug: "nestjs", color: "#ff6b9d" },
    { name: "TypeScript", slug: "typescript", color: "#60a5fa" },
    { name: "Docker", slug: "docker", color: "#c084fc" },
    { name: "PostgreSQL", slug: "postgresql", color: "#60a5fa" },
    { name: "全栈", slug: "fullstack", color: "#ff6b9d" },
    { name: "动画", slug: "animation", color: "#c084fc" },
    { name: "CSS", slug: "css", color: "#22d3ee" },
    { name: "性能优化", slug: "performance", color: "#ff6b9d" },
    { name: "日常", slug: "daily", color: "#c084fc" },
  ];
  const tags: Record<string, number> = {};
  for (const t of tagData) {
    const tag = await prisma.tag.upsert({
      where: { slug: t.slug },
      update: {},
      create: t,
    });
    tags[t.slug] = tag.id;
  }
  console.log(`✅ 标签: ${tagData.length} 个`);

  // ========== 4. 清理旧文章 ==========
  await prisma.postTag.deleteMany();
  await prisma.post.deleteMany();
  await prisma.chatter.deleteMany();

  // ========== 5. 10 篇文章（日期错开，最新在前） ==========
  const baseDate = new Date("2026-06-01T12:00:00Z");
  const posts = [
    {
      title: "从零构建毛玻璃 Bento Grid 博客 — 全栈开发手记",
      slug: "building-glass-bento-blog",
      createdAt: new Date(baseDate.getTime() - 0 * 86400000),
      content: `## 前言

花了三周时间从零搭建了这个博客。今天来记录一下技术选型、架构设计和毛玻璃特效的实现踩坑过程。

## 技术选型

选择技术栈时我考虑了以下几点：

1. **前端** — Vue 3 + Vite + Tailwind CSS v4 + GSAP
2. **后端** — NestJS + Prisma + PostgreSQL 16
3. **部署** — Docker Compose + Nginx + Let's Encrypt SSL

## 毛玻璃特效实现

毛玻璃（Glassmorphism）的核心 CSS：

\`\`\`css
.glass {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
\`\`\`

### 踩坑记录

1. **backdrop-filter 叠加层数** — 超过 3 层会严重卡顿，需要控制
2. **父元素 transform** — 会导致 backdrop-filter 失效
3. **Safari 兼容** — 需要 -webkit- 前缀

## Bento Grid 布局

使用 CSS Grid 的 \`grid-cols-12\` 实现：

\`\`\`html
<div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
  <div class="lg:col-span-5">ProfileCard</div>
  <div class="lg:col-span-7">MusicCard</div>
</div>
\`\`\`

## 总结

完整代码已开源在 GitHub。整个项目大约写了 4 周，期间踩了不少坑但收获满满。`,
      excerpt: "记录从零搭建毛玻璃风格博客的全过程：Vue 3 + NestJS + Prisma 技术栈选型、Bento Grid 布局实现、毛玻璃特效踩坑全记录。",
      coverImage: "https://picsum.photos/seed/blog1/800/400",
      published: true,
      pinned: true,
      categorySlug: "frontend",
      tagSlugs: ["vue3", "css", "fullstack"],
      readingTime: 5,
      viewCount: 2300,
    },
    {
      title: "NestJS + Prisma 7 后端 API 搭建完整指南",
      slug: "nestjs-prisma7-api-guide",
      content: `## NestJS 入门

NestJS 是一个渐进式 Node.js 框架，底层基于 Express，支持 TypeScript 和装饰器。

## 安装 Prisma 7

\`\`\`bash
npm install prisma @prisma/client @prisma/adapter-pg
npx prisma init
\`\`\`

Prisma 7 的一个重大变化是将数据库连接 URL 从 \`schema.prisma\` 移到了 \`prisma.config.ts\`。

### prisma.config.ts

\`\`\`typescript
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
\`\`\`

## 创建 PrismaService

\`\`\`typescript
@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });
    super({ adapter });
  }
}
\`\`\`

## JWT 认证

使用 @nestjs/jwt 和 @nestjs/passport 实现 JWT 认证：

1. AuthModule 注册 JwtModule
2. JwtStrategy 验证 token
3. AuthGuard + RolesGuard 保护路由

## 总结

NestJS + Prisma 的组合非常适合快速构建后端 API，类型安全且开发体验极好。`,
      excerpt: "详细介绍如何使用 NestJS 配合 Prisma 7 搭建后端 API，包括 JWT 认证、Guard 权限控制、数据库迁移等核心内容。",
      coverImage: "https://picsum.photos/seed/blog2/800/400",
      published: true,
      pinned: true,
      categorySlug: "backend",
      tagSlugs: ["nestjs", "postgresql", "typescript"],
      readingTime: 6,
      viewCount: 1800,
    },
    {
      title: "Tailwind CSS v4 迁移指南 — 从 v3 到 v4 的变化",
      slug: "tailwind-v4-migration",
      content: `## Tailwind v4 来了

Tailwind CSS v4 在 2025 年正式发布，带来了许多令人兴奋的变化。

## 核心变化

### 1. CSS-first 配置

v4 不再需要 \`tailwind.config.js\`：

\`\`\`css
@import "tailwindcss";

@theme {
  --color-accent: #ff6b9d;
}
\`\`\`

### 2. 更快的构建速度

v4 使用新的 Oxide 引擎，构建速度快了 10 倍以上。

### 3. 更好的暗色模式

使用 \`@variant\` 指令：

\`\`\`css
@variant dark {
  .card { background: #1a1a1a; }
}
\`\`\`

## 迁移步骤

1. 升级依赖
2. 移除 tailwind.config.js
3. 更新 CSS 入口文件
4. 测试所有组件

## 遇到的问题

- **类名冲突** — v4 的自动检测机制可能引入多余的样式
- **@theme 语法** — 需要熟悉新的自定义属性语法

## 总结

v4 的体验明显提升，值得升级。`,
      excerpt: "Tailwind CSS v4 带来了全新的 CSS-first 配置方式、更快的 Oxide 引擎和更好的暗色模式支持。本文分享从 v3 迁移到 v4 的完整经验。",
      coverImage: "https://picsum.photos/seed/blog3/800/400",
      published: true,
      pinned: false,
      categorySlug: "frontend",
      tagSlugs: ["css", "typescript", "animation"],
      readingTime: 4,
      viewCount: 950,
    },
    {
      title: "Docker 多阶段构建最佳实践",
      slug: "docker-multi-stage-build",
      content: `## 什么是多阶段构建

多阶段构建允许你在 Dockerfile 中使用多个 FROM 指令，每个阶段可以使用不同的基础镜像。

## 为什么要用多阶段构建

1. **减小镜像体积** — 生产镜像只包含必要的文件
2. **分离构建和运行环境** — 构建依赖不进入生产镜像
3. **提高安全性** — 减少攻击面

## 实战：NestJS 后端

\`\`\`dockerfile
# 阶段1：构建
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# 阶段2：生产
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/main.js"]
\`\`\`

## 优化技巧

- 使用 \`.dockerignore\` 排除不必要的文件
- 利用 Docker BuildKit 缓存
- 合并 RUN 指令减少层数

## 总结

多阶段构建是 Docker 中最实用的特性之一，能让你的镜像从 1GB 降到 200MB。`,
      excerpt: "通过 NestJS 后端项目的实际案例，讲解 Docker 多阶段构建如何将镜像体积从 1GB 优化到 200MB，以及 .dockerignore、BuildKit 等进阶技巧。",
      coverImage: "https://picsum.photos/seed/blog4/800/400",
      published: true,
      pinned: false,
      categorySlug: "backend",
      tagSlugs: ["docker", "nestjs", "performance"],
      readingTime: 5,
      viewCount: 1200,
    },
    {
      title: "GSAP + Vue 3 动画实战：滚动视差与 3D 卡片效果",
      slug: "gsap-vue3-animation",
      content: `## GSAP 简介

GSAP（GreenSock Animation Platform）是 web 上最强大的动画库之一。

## 安装与配置

\`\`\`bash
npm install gsap
\`\`\`

## ScrollTrigger 滚动动画

\`\`\`typescript
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

gsap.fromTo(".card",
  { opacity: 0, y: 30 },
  {
    opacity: 1, y: 0, duration: 0.8,
    scrollTrigger: {
      trigger: ".card",
      start: "top 85%",
    },
  }
);
\`\`\`

## 3D 卡片倾斜

\`\`\`typescript
card.addEventListener("mousemove", (e) => {
  const rect = card.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;

  gsap.to(card, {
    rotateY: x * 20,
    rotateX: -y * 20,
    duration: 0.5,
  });
});
\`\`\`

## 性能优化

- 使用 \`will-change\` 提示 GPU 加速
- 避免在滚动回调中创建新对象
- 使用 \`gsap.timeline()\` 管理复杂动画组合

## 总结

GSAP 和 Vue 3 的组合非常强大，配合 ScrollTrigger 能轻松实现复杂的滚动动画效果。`,
      excerpt: "深入 GSAP 动画库在 Vue 3 项目中的实战应用：ScrollTrigger 滚动渐入、卡片 3D 倾斜、性能优化等核心技巧。",
      coverImage: "https://picsum.photos/seed/blog5/800/400",
      published: true,
      pinned: false,
      categorySlug: "frontend",
      tagSlugs: ["vue3", "animation", "css"],
      readingTime: 4,
      viewCount: 1500,
    },
    {
      title: "PostgreSQL 16 性能调优笔记",
      slug: "postgresql16-tuning",
      content: `## 数据库性能优化

PostgreSQL 16 带来了多项性能改进。以下是我在实际项目中的调优经验。

## 关键配置参数

### shared_buffers

\`\`\`ini
shared_buffers = 256MB  # 建议为总内存的 25%
\`\`\`

### effective_cache_size

\`\`\`ini
effective_cache_size = 1GB  # 建议为总内存的 50-75%
\`\`\`

## 索引优化

\`\`\`sql
-- 创建复合索引
CREATE INDEX idx_posts_category_published
  ON posts(category_id, published);

-- 使用部分索引
CREATE INDEX idx_posts_published
  ON posts(created_at) WHERE published = true;
\`\`\`

### 查询分析

使用 \`EXPLAIN ANALYZE\` 分析慢查询：

\`\`\`sql
EXPLAIN ANALYZE
SELECT * FROM posts
WHERE published = true
ORDER BY created_at DESC
LIMIT 10;
\`\`\`

## 日常维护

- 定期 \`VACUUM ANALYZE\`
- 监控连接数
- 设置合理的连接池

## 总结

PostgreSQL 的调优是持续的过程，建议从监控入手，针对瓶颈逐步优化。`,
      excerpt: "分享 PostgreSQL 16 在实际项目中的性能调优经验，包括关键配置参数、索引优化策略和日常维护建议。",
      coverImage: "https://picsum.photos/seed/blog6/800/400",
      published: true,
      pinned: false,
      categorySlug: "backend",
      tagSlugs: ["postgresql", "performance", "typescript"],
      readingTime: 5,
      viewCount: 780,
    },
    {
      title: "TypeScript 5.7+ 新特性一览",
      slug: "typescript-57-features",
      content: `## TypeScript 新版本

TypeScript 持续演进，5.7+ 版本带来了不少实用特性。

## 1. 更好的类型推断

\`\`\`typescript
// 现在自动推断更准确
const arr = [1, 2, "hello"];
// arr: (string | number)[]
\`\`\`

## 2. 增强的模板字面量类型

\`\`\`typescript
type EventName<T extends string> = \`on\${Capitalize<T>}\`;
type Click = EventName<"click">; // "onClick"
\`\`\`

## 3. satisfies 运算符

\`\`\`typescript
const config = {
  host: "localhost",
  port: 5432,
} satisfies DatabaseConfig;
\`\`\`

## Strict 模式的价值

启用 strict 模式后：
- **noImplicitAny** — 禁止隐式 any
- **strictNullChecks** — 空值检查
- **noUnusedLocals** — 未使用变量警告

## 在项目中的应用

我们的博客项目全面启用了 strict 模式，类型安全大大提高了代码质量。

## 总结

TypeScript 的类型系统越来越强大，建议保持最新版本并开启 strict 模式。`,
      excerpt: "TypeScript 5.7+ 带来了更智能的类型推断、增强的模板字面量类型和 satisfies 运算符。一起看看在实战中如何用上这些新特性。",
      coverImage: "https://picsum.photos/seed/blog7/800/400",
      published: true,
      pinned: false,
      categorySlug: "frontend",
      tagSlugs: ["typescript", "vue3", "fullstack"],
      readingTime: 3,
      viewCount: 650,
    },
    {
      title: "我的 2025 年开发环境配置",
      slug: "dev-environment-2025",
      content: `## 我的开发环境

花了一个周末重新配置了开发环境，记录一下供参考。

## 硬件

- 主力机：Windows 11 Pro + WSL2 Ubuntu
- 内存：32GB DDR5
- 显示器：4K 双屏

## 编辑器

### VS Code

最爱的配置：

\`\`\`json
{
  "editor.fontFamily": "JetBrains Mono",
  "editor.fontSize": 14,
  "editor.formatOnSave": true,
  "workbench.colorTheme": "Tokyo Night"
}
\`\`\`

### 必备插件

1. Vue Official (Volar)
2. Tailwind CSS IntelliSense
3. Prisma
4. ESLint + Prettier
5. Docker
6. Error Lens

## 终端

- Windows Terminal + Oh My Posh
- 常用工具：bat, fd, ripgrep, zoxide

## 日常习惯

- 写完代码立即提交
- 每天跑一次测试
- 代码 review 前先自审

## 总结

好的工具能显著提升开发体验，花时间配置好环境绝对值得。`,
      excerpt: "分享一下我的 2025 年开发环境配置，包括 VS Code 插件、终端工具、WSL2 Ubuntu 设置和日常开发习惯。",
      coverImage: "https://picsum.photos/seed/blog8/800/400",
      published: true,
      pinned: false,
      categorySlug: "life",
      tagSlugs: ["daily", "typescript", "docker"],
      readingTime: 3,
      viewCount: 420,
    },
    {
      title: "Vue 3 Composables 设计模式",
      slug: "vue3-composables-patterns",
      content: `## 什么是 Composable

Vue 3 的 Composition API 允许我们将逻辑封装成可复用的 composable 函数。

## 基本模式

\`\`\`typescript
// useCounter.ts
import { ref } from "vue";

export function useCounter(initial = 0) {
  const count = ref(initial);
  const increment = () => count.value++;
  const decrement = () => count.value--;

  return { count, increment, decrement };
}
\`\`\`

## 高级模式

### 带生命周期的 Composable

\`\`\`typescript
export function useMousePosition() {
  const x = ref(0);
  const y = ref(0);

  onMounted(() => {
    window.addEventListener("mousemove", update);
  });

  onUnmounted(() => {
    window.removeEventListener("mousemove", update);
  });

  return { x, y };
}
\`\`\`

## 本博客的使用案例

我们在项目中使用了多个 composable：

- **useSakura** — 樱花飘落动画
- **useCursorGlow** — 鼠标光晕
- **useGsap** — 滚动动画

## 设计原则

1. 单一职责
2. 可测试性
3. 明确的输入输出
4. 适当的清理

## 总结

Composable 是 Vue 3 最强的特性之一，合理设计能让代码复用性大幅提升。`,
      excerpt: "探索 Vue 3 Composables 的设计模式：从基础计数器到复杂的状态管理、事件监听和动画封装，以及本博客中的实际应用案例。",
      coverImage: "https://picsum.photos/seed/blog9/800/400",
      published: true,
      pinned: false,
      categorySlug: "frontend",
      tagSlugs: ["vue3", "typescript", "animation"],
      readingTime: 4,
      viewCount: 880,
    },
    {
      title: "周末漫游：秋叶原的午后",
      slug: "akihabara-afternoon",
      content: `## 出发

周六下午，阳光正好。决定去秋叶原逛逛。

## 电器街

秋叶原的电器街依然热闹。各种电子元件、旧游戏机、动漫周边琳琅满目。

> "秋叶原不仅仅是电器街，更是二次元文化的圣地。"

## 女仆咖啡厅

路过一家女仆咖啡厅，被可爱的女仆小姐姐拉进去喝了一杯拿铁。拿铁上画了一只小猫，太可爱了舍不得喝。

## 游戏中心

去了 SEGA 大楼，抓娃娃机真的会让人上瘾。花了 500 日元，抓到了一个小皮卡丘。

## 晚餐

在附近的拉面店点了一碗豚骨拉面。浓郁的汤头配上软烂的叉烧，是对一天最好的收尾。

## 回家的路上

夜幕降临，秋叶原的霓虹灯开始闪烁。提着战利品，听着耳机里的动漫歌曲，感觉这才是生活。

---

有机会还会再来。下次目标：把那边的初音手办带回家！ 🎵`,
      excerpt: "一个阳光正好的周六午后，在秋叶原的电器街漫步，逛女仆咖啡厅、抓娃娃机、吃豚骨拉面的日常记录。",
      coverImage: "https://picsum.photos/seed/blog10/800/400",
      published: true,
      pinned: false,
      categorySlug: "life",
      tagSlugs: ["daily"],
      readingTime: 2,
      viewCount: 320,
    },
  ];

  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const { categorySlug, tagSlugs, createdAt, ...postData } = p;
    const post = await prisma.post.create({
      data: {
        ...postData,
        createdAt: createdAt || new Date(baseDate.getTime() - i * 86400000),
        authorId: admin.id,
        categoryId: categories[categorySlug],
      },
    });

    // 关联标签
    for (const ts of tagSlugs) {
      await prisma.postTag.create({
        data: { postId: post.id, tagId: tags[ts] },
      });
    }
  }
  console.log(`✅ 文章: ${posts.length} 篇`);

  // ========== 6. 几条杂谈 ==========
  const chatterData = [
    { title: "今天重构了后端 API 层", content: "把 NestJS 的 Service 层全部拆了一遍，每个模块只做一件事。clean architecture 的快乐谁懂啊。顺便把 Prisma schema 也优化了，query 速度肉眼可见地快了。", mood: "😌", tags: ["日常", "后端", "NestJS"] },
    { title: "新学了 GSAP 的 timeline 功能", content: "之前一直用单个 tween，今天试了下 timeline，简直打开了新世界的大门。多个动画编排起来太优雅了。感觉之前写的动画代码都可以重写了 😅", mood: "🤩", tags: ["前端", "GSAP", "动画"] },
    { title: "樱花开了", content: "楼下的樱花树终于开了。粉色的一大片，风一吹花瓣就飘下来，美得不像话。拍了好多照片，回头传到照片墙。", mood: "🌸", tags: ["日常", "生活"] },
    { title: "调试了一个诡异的 CSS Bug", content: "backdrop-filter 在父元素设置 transform 后会失效。这个问题搞了我整整两个小时。最后在 MDN 文档的角落里找到了说明。前端真是……", mood: "😫", tags: ["前端", "CSS", "踩坑"] },
  ];
  for (const c of chatterData) {
    await prisma.chatter.create({
      data: { ...c, authorId: admin.id },
    });
  }
  console.log(`✅ 杂谈: ${chatterData.length} 条`);

  // ========== 7. 相册 + 照片 ==========
  await prisma.photo.deleteMany();
  await prisma.album.deleteMany();

  const albumData = [
    {
      name: "2026 · 春日漫游记",
      description: "樱花、老街、午后的猫 — 用镜头记录春天的每一个温柔瞬间。",
      date: new Date("2026-04-15T08:00:00Z"),
      coverImage: "https://picsum.photos/seed/album-spring-cover/800/400",
      photos: [
        { url: "https://picsum.photos/seed/sakura1/1200/800", title: "樱花烂漫" },
        { url: "https://picsum.photos/seed/sakura2/1200/800", title: "老街午后" },
        { url: "https://picsum.photos/seed/sakura3/1200/800", title: "猫与阳光" },
        { url: "https://picsum.photos/seed/sakura4/1200/800", title: "春日小径" },
        { url: "https://picsum.photos/seed/sakura5/1200/800", title: "花下茶会" },
      ],
    },
    {
      name: "秋叶原散策",
      description: "霓虹、手办、女仆咖啡厅 — 二次元圣地的一日散策记录。",
      date: new Date("2026-05-20T10:00:00Z"),
      coverImage: "https://picsum.photos/seed/album-akiba-cover/800/400",
      photos: [
        { url: "https://picsum.photos/seed/akiba1/1200/800", title: "电器街入口" },
        { url: "https://picsum.photos/seed/akiba2/1200/800", title: "SEGA 大楼" },
        { url: "https://picsum.photos/seed/akiba3/1200/800", title: "女仆咖啡厅" },
        { url: "https://picsum.photos/seed/akiba4/1200/800", title: "手办橱窗" },
        { url: "https://picsum.photos/seed/akiba5/1200/800", title: "霓虹夜景" },
      ],
    },
  ];

  for (const a of albumData) {
    const { photos, ...albumInfo } = a;
    const album = await prisma.album.create({ data: albumInfo });
    for (const p of photos) {
      await prisma.photo.create({
        data: {
          ...p,
          thumbnail: p.url.replace("/1200/800", "/300/200"),
          albumId: album.id,
        },
      });
    }
  }
  const totalPhotos = albumData.reduce((sum, a) => sum + a.photos.length, 0);
  console.log(`✅ 相册: ${albumData.length} 个, 照片: ${totalPhotos} 张`);

  // ========== 8. 站点配置 ==========
  const configs = [
    { key: "site_title", value: JSON.stringify("HGL Blog 🌸") },
    { key: "site_description", value: JSON.stringify("一个二次元毛玻璃风格的个人博客") },
    { key: "danmaku_texts", value: JSON.stringify(["Tailwind CSS 拯救前端", "睡大觉中 💤", "Vue 3 真香", "NestJS 后端启动！", "TypeScript 大法好", "PostgreSQL 稳如老狗", "Docker 一键部署", "毛玻璃真是太帅了", "🌸 樱花飞舞 🌸", "🎵 音乐治愈一切 🎵", "半夜写代码灵感最多", "BUG 退散！"]) },
    { key: "bio", value: JSON.stringify("写代码、看动漫、听音乐。这里是记录技术探索和生活碎片的数字花园。") },
    { key: "social_links", value: JSON.stringify([{ icon: "🐙", label: "GitHub", url: "https://github.com" }, { icon: "📧", label: "Email", url: "mailto:hello@hgl123.icu" }]) },
  ];
  for (const cfg of configs) {
    await prisma.siteConfig.upsert({
      where: { key: cfg.key },
      update: { value: cfg.value },
      create: cfg,
    });
  }
  console.log(`✅ 站点配置: ${configs.length} 项`);

  console.log("\n🎉 种子数据播种完成！");
  console.log("   默认管理员: admin / admin123");
  console.log("   ⚠️  部署后请立即修改默认密码！");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
