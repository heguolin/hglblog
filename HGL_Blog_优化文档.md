# HGL Blog 优化文档

> **项目**：HGL Blog（hgl123.icu）  
> **技术栈**：Vue 3 + TypeScript + Tailwind v4 + GSAP（前端）/ NestJS + Prisma + PostgreSQL + Redis（后端）/ Docker + Nginx + Ubuntu（部署）  
> **文档生成日期**：2026-06-07  
> **缺陷总数**：11 项

---

## 目录

1. [文章详情页 - 代码块对比度过低](#1-文章详情页---代码块对比度过低)
2. [文章详情页 - 右侧目录区大片留白](#2-文章详情页---右侧目录区大片留白)
3. [后台编辑文章页 - 加载文章失败](#3-后台编辑文章页---加载文章失败)
4. [后台编辑文章页 - Markdown 编辑器未撑满全屏](#4-后台编辑文章页---markdown-编辑器未撑满全屏)
5. [后台编辑文章页 - 右侧属性面板布局待优化](#5-后台编辑文章页---右侧属性面板布局待优化)
6. [评论功能 - 弃用 Waline，改为自研实现](#6-评论功能---弃用-waline改为自研实现)
7. [首页底部 - 技术标签栏需移除](#7-首页底部---技术标签栏需移除)
8. [全站 - 运行天数计算错误](#8-全站---运行天数计算错误)
9. [首页系统信息 - 需展示真实服务器指标](#9-首页系统信息---需展示真实服务器指标)
10. [首页音乐播放器 - 功能未真正实现](#10-首页音乐播放器---功能未真正实现)
11. [首页顶部布局 - 横向撑满、缺少留白](#11-首页顶部布局---横向撑满缺少留白)

---

## 1. 文章详情页 - 代码块对比度过低

| 属性 | 内容 |
|------|------|
| **所属页面** | 文章详情页（`/posts/:id`） |
| **缺陷类型** | 样式 |
| **优先级** | 高 |

### 问题描述

文章正文中的代码块直接叠加在全站二次元立绘背景图之上，代码块容器背景过于透明（毛玻璃/半透明效果），导致：

- 注释文字（灰色）、普通变量名等低对比度文字几乎不可辨认
- 语法高亮颜色与背景明度不匹配，阅读体验极差
- 飘落的樱花动画粒子会遮挡代码内容

### 建议修复方案

```css
/* 给代码块容器加足够不透明的深色底色 */
.prose pre {
  background-color: rgba(10, 10, 20, 0.92) !important;
  backdrop-filter: blur(2px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  position: relative;
  z-index: 1; /* 确保代码块层级高于背景粒子 */
}

/* 提高代码文字基础亮度 */
.prose pre code {
  color: #e2e8f0;
  font-size: 0.875rem;
  line-height: 1.7;
}
```

- 选用适合暗色背景的语法高亮主题（如 `One Dark`、`Tokyo Night`、`Dracula`）
- 确保代码块 `z-index` 高于樱花动画层，避免粒子遮挡

---

## 2. 文章详情页 - 右侧目录区大片留白

| 属性 | 内容 |
|------|------|
| **所属页面** | 文章详情页（`/posts/:id`） |
| **缺陷类型** | 样式 / 布局 |
| **优先级** | 中 |

### 问题描述

文章详情页采用「左侧正文 + 右侧目录（sticky）」双栏布局，正文内容列宽度偏窄，右侧目录卡片下方存在大片空白区域，造成「左挤右空」的视觉失衡感，尤其在大屏设备（1440px+）上问题更明显。

### 建议修复方案

```css
/* 调整文章页整体布局容器 */
.article-layout {
  display: grid;
  grid-template-columns: 1fr 280px; /* 正文自适应，目录固定宽度 */
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* 大屏时适当加宽正文区 */
@media (min-width: 1440px) {
  .article-layout {
    grid-template-columns: 1fr 300px;
    max-width: 1400px;
  }
}

/* 目录 sticky 定位，只占实际内容高度 */
.article-toc {
  position: sticky;
  top: 80px;
  align-self: start; /* 关键：不拉伸到整行高度 */
  max-height: calc(100vh - 100px);
  overflow-y: auto;
}
```

---

## 3. 后台编辑文章页 - 加载文章失败

| 属性 | 内容 |
|------|------|
| **所属页面** | 后台文章编辑页（`/admin/posts/edit/:id`） |
| **缺陷类型** | 功能 Bug |
| **优先级** | 紧急 |

### 问题描述

进入已发布文章的编辑页时，编辑器区域直接显示「**加载文章失败**」，文章原有内容无法回填到编辑器中，导致已发布文章完全无法二次编辑。

### 可能原因排查

1. **接口问题**：`GET /api/posts/:id` 接口报错（401 未授权 / 404 不存在 / 500 服务端错误）
2. **ID 取值错误**：路由参数 `id` 解析失败或类型不匹配（如字符串 vs 数字）
3. **数据绑定问题**：接口返回正常但数据未正确挂载到编辑器的 `v-model`
4. **编辑器初始化时序**：编辑器组件尚未 `mounted` 时数据已到达，导致内容丢失

### 建议修复方案

```typescript
// 后端：确保编辑接口鉴权与数据返回正常
// GET /api/admin/posts/:id
@Get(':id')
@UseGuards(JwtAuthGuard)
async getPostById(@Param('id') id: string) {
  const post = await this.postsService.findOne(+id);
  if (!post) throw new NotFoundException('文章不存在');
  return post;
}
```

```typescript
// 前端：确保编辑器初始化后再设置内容
onMounted(async () => {
  const id = route.params.id;
  try {
    const res = await api.get(`/admin/posts/${id}`);
    // 等编辑器实例就绪后再赋值
    await nextTick();
    editorContent.value = res.data.content;
    postForm.value = { ...res.data };
  } catch (err) {
    message.error('加载文章失败：' + err.message);
  }
});
```

---

## 4. 后台编辑文章页 - Markdown 编辑器未撑满全屏

| 属性 | 内容 |
|------|------|
| **所属页面** | 后台文章编辑页（`/admin/posts/edit/:id`、`/admin/posts/new`） |
| **缺陷类型** | 样式 / 布局 |
| **优先级** | 中 |

### 问题描述

Markdown 编辑区域（含工具栏：Lv1~Lv6 标题、插入图片链接、上传图片、裁剪上传等）当前宽度和高度没有撑满可用区域，写作体验受限，长文编辑时需要频繁滚动。

### 建议修复方案

```css
/* 编辑页整体容器充满视口高度 */
.admin-edit-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* 编辑区主体自适应撑满剩余高度 */
.editor-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; /* flex 子项高度收缩关键 */
}

/* Markdown 编辑器撑满容器 */
.md-editor {
  flex: 1;
  height: 100% !important;
  min-height: calc(100vh - 120px); /* 减去顶栏高度 */
}
```

---

## 5. 后台编辑文章页 - 右侧属性面板布局待优化

| 属性 | 内容 |
|------|------|
| **所属页面** | 后台文章编辑页（`/admin/posts/edit/:id`） |
| **缺陷类型** | 样式 / 布局 |
| **优先级** | 低 |

### 问题描述

编辑页右侧属性面板包含：分类（🎨 前端开发 / ⚙️ 后端开发 / 🌸 生活随笔）、标签（#CSS #Docker #NestJS #PostgreSQL #TypeScript #Vue3 等）、发布操作（📢 发布 / 💾 草稿 / 🔗 确认 / 📌 置顶）等控件，当前排布不够整齐，间距和视觉层级需要改善。

### 建议修复方案

- 右侧面板设置固定宽度（280~320px），使用 `sticky` 定位跟随滚动
- 每个属性分组用卡片（`rounded-lg + bg-opacity`）隔离，加清晰的分组标题
- 标签选择器改为 `flex-wrap` 气泡式多选，选中态用高亮色区分
- 操作按钮（发布/草稿）放在面板底部固定位置，突出主操作按钮样式

---

## 6. 评论功能 - 弃用 Waline，改为自研实现

| 属性 | 内容 |
|------|------|
| **所属页面** | 文章详情页、关于我页（`/about`） |
| **缺陷类型** | 功能 / 架构 |
| **优先级** | 高 |

### 问题描述

当前文章详情页底部和关于我页的评论区均使用 **Waline** 第三方评论系统，且仍处于「部署后请配置 serverURL」的待配置状态。计划**弃用 Waline，完全自研评论功能**并进行优化。

### 建议实现方案

#### 数据库表设计（Prisma Schema）

```prisma
model Comment {
  id        Int       @id @default(autoincrement())
  content   String
  author    String
  email     String?
  postId    Int?
  pageType  String    @default("post") // "post" | "about"
  parentId  Int?      // 支持回复嵌套
  parent    Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentReplies")
  approved  Boolean   @default(false) // 审核机制
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

#### 后端接口（NestJS）

```
GET    /api/comments?postId=:id     // 获取评论列表（仅已审核）
POST   /api/comments                // 提交新评论
DELETE /api/admin/comments/:id      // 后台删除评论
PATCH  /api/admin/comments/:id/approve  // 后台审核评论
```

#### 前端功能要点

- 评论列表支持楼层展示 + 回复嵌套（最多 2 层）
- 提交评论需填写昵称（必填）、邮件（选填）、内容
- 评论提交后显示「审核中」状态，审核通过后展示
- 时间显示使用相对时间（如「3 分钟前」）
- 后台增加「评论管理」模块（侧边栏新增 💬 评论入口）

---

## 7. 首页底部 - 技术标签栏需移除

| 属性 | 内容 |
|------|------|
| **所属页面** | 全站底部 Footer |
| **缺陷类型** | 样式 / 内容 |
| **优先级** | 低 |

### 问题描述

全站 Footer 区域（包括首页「系统信息」模块下方）有一排技术栈标签（Vue 3 / TypeScript / Tailwind v4 / GSAP / NestJS / Prisma / PostgreSQL / Redis / Docker / Nginx / Ubuntu），页脚处还有第二次重复出现，视觉冗余、影响页面简洁度。

### 建议修复方案

- **直接删除**底部技术标签栏的 HTML 模板与对应样式
- Footer 只保留：版权信息（© 2026 HGL Blog）、备案号（湘ICP备2026021710号）、系统运行状态、进入后台入口

---

## 8. 全站 - 运行天数计算错误

| 属性 | 内容 |
|------|------|
| **所属页面** | 首页、全站 Footer |
| **缺陷类型** | 功能 Bug |
| **优先级** | 高 |

### 问题描述

全站多处显示「已稳定运行 522 天」，该数值为硬编码静态值，与实际不符。博客系统起始运行日期应为 **2026 年 6 月 5 日**，以当前日期 2026-06-07 计算，实际运行天数应为 **2 天**，而非 522 天。

### 建议修复方案

```typescript
// utils/runningDays.ts
export function getRunningDays(): number {
  const startDate = new Date('2026-06-05T00:00:00+08:00');
  const now = new Date();
  const diff = now.getTime() - startDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
```

```vue
<!-- 在组件中使用 -->
<template>
  <span>已稳定运行 {{ runningDays }} 天</span>
</template>

<script setup>
import { getRunningDays } from '@/utils/runningDays';
const runningDays = getRunningDays();
</script>
```

- **全局替换**所有硬编码的 `522` 天，统一调用该工具函数
- 建议每天零点或页面加载时动态刷新计算值

---

## 9. 首页系统信息 - 需展示真实服务器指标

| 属性 | 内容 |
|------|------|
| **所属页面** | 首页「📊 系统信息」模块 |
| **缺陷类型** | 功能 |
| **优先级** | 中 |

### 问题描述

当前「系统信息」模块仅展示一排静态技术栈标签和「运行中」状态，并非真实的服务器运行数据，无实际信息价值。

### 建议实现方案

#### 后端接口（NestJS）

```typescript
// system.controller.ts
@Get('system/info')
async getSystemInfo() {
  const os = require('os');
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  return {
    cpu: os.cpus()[0].model,
    cpuCores: os.cpus().length,
    memTotal: (totalMem / 1024 / 1024 / 1024).toFixed(1) + ' GB',
    memUsed: (usedMem / 1024 / 1024 / 1024).toFixed(1) + ' GB',
    memUsage: ((usedMem / totalMem) * 100).toFixed(1) + '%',
    platform: os.platform(),
    arch: os.arch(),
    uptime: Math.floor(os.uptime() / 3600) + ' 小时',
    nodeVersion: process.version,
    loadAvg: os.loadavg()[0].toFixed(2),
  };
}
```

#### 前端展示建议

- 使用进度条可视化内存/CPU 占用率
- 每 30 秒轮询一次接口刷新数据
- 展示字段：CPU 型号及核数、内存使用率、系统运行时间（uptime）、Node.js 版本、系统负载

---

## 10. 首页音乐播放器 - 功能未真正实现

| 属性 | 内容 |
|------|------|
| **所属页面** | 首页右上角「Now Playing」播放器 |
| **缺陷类型** | 功能 |
| **优先级** | 高 |

### 问题描述

首页「Now Playing」播放器（当前显示 The Weeknd《Blinding Lights》/ After Hours，进度 1:42 / 3:58，含 ⏮⏸⏭ 按钮）仅为静态 UI 展示，所有交互按钮无实际功能，进度条不可拖拽，没有真实音频播放能力。

### 建议实现方案

#### 方案一：使用 HTML5 Audio API 自实现

```typescript
// composables/useAudioPlayer.ts
import { ref, reactive } from 'vue';

export interface Track {
  title: string;
  artist: string;
  album: string;
  cover: string;
  src: string; // 音频文件 URL
}

export function useAudioPlayer(playlist: Track[]) {
  const audio = new Audio();
  const currentIndex = ref(0);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);

  const loadTrack = (index: number) => {
    audio.src = playlist[index].src;
    audio.load();
  };

  const play = () => { audio.play(); isPlaying.value = true; };
  const pause = () => { audio.pause(); isPlaying.value = false; };
  const toggle = () => isPlaying.value ? pause() : play();

  const prev = () => {
    currentIndex.value = (currentIndex.value - 1 + playlist.length) % playlist.length;
    loadTrack(currentIndex.value);
    play();
  };

  const next = () => {
    currentIndex.value = (currentIndex.value + 1) % playlist.length;
    loadTrack(currentIndex.value);
    play();
  };

  const seek = (time: number) => { audio.currentTime = time; };

  audio.addEventListener('timeupdate', () => { currentTime.value = audio.currentTime; });
  audio.addEventListener('loadedmetadata', () => { duration.value = audio.duration; });
  audio.addEventListener('ended', next);

  loadTrack(0);

  return { currentIndex, isPlaying, currentTime, duration, toggle, prev, next, seek };
}
```

#### 方案二：集成 APlayer 播放器组件

```bash
npm install aplayer
```

```vue
<APlayer :audio="playlist" :lrcType="3" fixed mini />
```

#### 功能要点

- 后台「设置」页提供歌单管理入口（增删歌曲，填写音频 URL / 封面 / 歌手 / 专辑）
- 音频文件存储建议：上传至对象存储（如阿里云 OSS / 腾讯 COS），返回播放 URL
- 进度条支持点击/拖拽跳转
- 歌曲信息（标题、歌手、专辑、封面）从后端接口动态获取

---

## 11. 首页顶部布局 - 横向撑满、缺少留白

| 属性 | 内容 |
|------|------|
| **所属页面** | 首页（`/`）及全站通用布局 |
| **缺陷类型** | 样式 / 布局 |
| **优先级** | 高 |

### 问题描述

首页顶部区域（个人信息卡片 + Now Playing 播放器）横向撑满了整个视口宽度，两侧没有留白，内容紧贴屏幕边缘，在大屏设备上尤为明显，布局不美观、不精致。

### 建议修复方案

```css
/* 全站统一内容容器 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem; /* 两侧留白 */
  width: 100%;
}

/* 顶部导航栏内容也限制在容器内 */
.navbar-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* 首页 Hero 区域顶部留白 */
.hero-section {
  padding-top: 2rem;    /* 顶部与导航栏间距 */
  padding-bottom: 2rem;
}

/* 响应式断点 */
@media (min-width: 1440px) {
  .container {
    max-width: 1300px;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }
}
```

- 确保所有页面内容区域都包裹在统一的 `.container` 容器中
- 导航栏背景可保持全宽，但内容（Logo + 菜单）限制在容器宽度内
- 首页卡片区域上方增加适当的 `padding-top`，与导航栏保持呼吸感

---

## 优化优先级汇总

| 优先级 | 编号 | 缺陷 / 优化点 | 类型 |
|--------|------|--------------|------|
| 🔴 紧急 | 3 | 编辑已发布文章时「加载文章失败」 | 功能 Bug |
| 🟠 高 | 1 | 文章代码块对比度过低、被背景干扰 | 样式 |
| 🟠 高 | 6 | 评论功能弃用 Waline，自研实现 | 功能/架构 |
| 🟠 高 | 8 | 运行天数硬编码 522，需动态计算 | 功能 Bug |
| 🟠 高 | 10 | 音乐播放器功能未实现，仅静态展示 | 功能 |
| 🟠 高 | 11 | 首页顶部横向撑满、缺少留白 | 样式/布局 |
| 🟡 中 | 2 | 文章详情页右侧大片留白 | 样式/布局 |
| 🟡 中 | 4 | MD 编辑器未撑满全屏 | 样式/布局 |
| 🟡 中 | 9 | 系统信息非真实数据 | 功能 |
| 🟢 低 | 5 | 后台编辑页右侧属性面板布局 | 样式/布局 |
| 🟢 低 | 7 | 底部技术标签栏冗余需移除 | 样式/内容 |

---

*文档由 Tabbit 根据 HGL Blog 页面巡检记录自动生成 · 2026-06-07*
