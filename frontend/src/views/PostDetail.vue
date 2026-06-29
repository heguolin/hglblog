<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import dayjs from "dayjs";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import { fetchPostBySlug, fetchPosts, type Post } from "@/api/posts";
import { useSEO } from "@/composables/useSEO";
import CommentSection from "@/components/common/CommentSection.vue";
import LazyImage from "@/components/common/LazyImage.vue";

const route = useRoute();
const router = useRouter();
useSEO("文章详情");

const post = ref<Post | null>(null);
const loading = ref(true);
const error = ref(false);
const prevPost = ref<Post | null>(null);
const nextPost = ref<Post | null>(null);

// ========== Markdown 渲染 ==========
const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(str: string, lang: string): string {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch { /* fallback */ }
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

const renderedHtml = computed(() => {
  if (!post.value) return "";
  return md.render(post.value.content);
});

// ========== TOC 提取 ==========
interface TocItem {
  id: string;
  text: string;
  level: number;
}

const toc = ref<TocItem[]>([]);
const activeTocId = ref("");

function extractToc() {
  nextTick(() => {
    const headings = document.querySelectorAll(".post-content h2, .post-content h3");
    toc.value = Array.from(headings).map((h) => {
      const id = h.textContent?.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9一-龥-]/g, "") ?? "";
      h.id = id;
      return { id, text: h.textContent ?? "", level: parseInt(h.tagName[1], 10) };
    });
  });
}

function scrollToHeading(id: string) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    activeTocId.value = id;
  }
}

// ========== 加载文章 + 上下篇 ==========
async function loadPost(slug: string) {
  loading.value = true;
  error.value = false;
  post.value = null;
  prevPost.value = null;
  nextPost.value = null;
  toc.value = [];
  activeTocId.value = "";

  try {
    post.value = await fetchPostBySlug(slug);

    // 获取所有已发布文章来确定上下篇
    const allPosts = await fetchPosts({ limit: 50, page: 1 });
    const sorted = allPosts.posts;
    const idx = sorted.findIndex((p) => p.slug === slug);
    if (idx > 0) nextPost.value = sorted[idx - 1];
    if (idx < sorted.length - 1) prevPost.value = sorted[idx + 1];

    await nextTick();
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
    // loading 变 false 后 DOM 才真正渲染 v-html，此时抽取 TOC
    await nextTick();
    extractToc();
  }
}

// ========== 滚动跟踪 TOC 高亮 ==========
function onScroll() {
  if (toc.value.length === 0) return;
  for (let i = toc.value.length - 1; i >= 0; i--) {
    const el = document.getElementById(toc.value[i].id);
    if (el && el.getBoundingClientRect().top < 120) {
      activeTocId.value = toc.value[i].id;
      break;
    }
  }
}

onMounted(() => {
  loadPost(route.params.slug as string);
  window.addEventListener("scroll", onScroll, { passive: true });
});

watch(() => route.params.slug, (newSlug) => {
  if (newSlug) loadPost(newSlug as string);
});
</script>

<template>
  <div class="page-container">
    <!-- 加载骨架 -->
    <div v-if="loading" class="animate-pulse space-y-4 max-w-3xl mx-auto">
      <div class="h-8 w-2/3 bg-white/10 rounded" />
      <div class="h-4 w-1/3 bg-white/10 rounded" />
      <div class="h-60 bg-white/5 rounded-xl mt-6" />
    </div>

    <!-- 文章内容 -->
    <div v-else-if="post" class="flex gap-8">
      <!-- 主内容区 -->
      <!-- 正文区：加宽到 max-w-4xl，减少右侧留白 -->
      <article class="flex-1 min-w-0 max-w-4xl mx-auto lg:mx-0 lg:pr-52 flex flex-col gap-10">
        <!-- 标题区 -->
        <header>
          <!-- 分类 -->
          <div v-if="post.category" class="flex items-center gap-3 mb-4">
            <span class="glass rounded-full px-3 py-1 text-xs text-white font-medium">
              {{ post.category.icon }} {{ post.category.name }}
            </span>
            <span v-if="post.pinned" class="text-xs text-accent-pink flex items-center gap-1">📌 置顶</span>
          </div>

          <!-- 标题 -->
          <h1 class="text-2xl md:text-3xl font-bold text-white leading-snug">
            {{ post.title }}
          </h1>

          <!-- Meta -->
          <div class="flex flex-wrap items-center gap-4 mt-4 text-sm text-text-muted">
            <span>📅 {{ dayjs(post.createdAt).format("YYYY 年 MM 月 DD 日") }}</span>
            <span v-if="post.readingTime">📖 {{ post.readingTime }} 分钟阅读</span>
            <span>👀 {{ post.viewCount.toLocaleString() }} 次浏览</span>
          </div>

          <!-- 标签 -->
          <div class="flex gap-2 mt-4">
            <span
              v-for="tag in post.tags"
              :key="tag.id"
              class="px-3 py-1 text-xs rounded-full border cursor-pointer hover:bg-white/10 transition-colors"
              :style="{ borderColor: tag.color || 'rgba(255,255,255,0.2)', color: tag.color || 'rgba(255,255,255,0.6)' }"
              @click="router.push(`/archive?tag=${tag.slug}`)"
            >
              #{{ tag.name }}
            </span>
          </div>
        </header>

        <!-- 封面图 -->
        <div
          v-if="post.coverImage"
          class="rounded-xl overflow-hidden bg-white/5"
        >
          <LazyImage
            :src="post.coverImage"
            :alt="post.title"
            aspect-ratio="16/9"
            :thumb-width="800"
            class="rounded-xl h-64 md:h-80"
          />
        </div>

        <!-- Markdown 渲染内容 -->
        <div
          class="post-content glass rounded-xl p-6 md:p-8"
          v-html="renderedHtml"
        />

        <!-- 上下篇导航 -->
        <nav class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- 上一篇 -->
          <router-link
            v-if="prevPost"
            :to="`/posts/${prevPost.slug}`"
            class="glass card-hover p-5 group text-left"
          >
            <p class="text-xs text-text-muted mb-1.5">← 上一篇</p>
            <p class="text-white text-sm font-medium group-hover:text-accent-cyan transition-colors line-clamp-1">
              {{ prevPost.title }}
            </p>
          </router-link>
          <div v-else class="glass rounded-xl p-5 opacity-50">
            <p class="text-xs text-text-muted">这是第一篇文章</p>
          </div>

          <!-- 下一篇 -->
          <router-link
            v-if="nextPost"
            :to="`/posts/${nextPost.slug}`"
            class="glass card-hover p-5 group text-left md:text-right"
          >
            <p class="text-xs text-text-muted mb-1.5">下一篇 →</p>
            <p class="text-white text-sm font-medium group-hover:text-accent-cyan transition-colors line-clamp-1">
              {{ nextPost.title }}
            </p>
          </router-link>
          <div v-else class="glass rounded-xl p-5 opacity-50 md:text-right">
            <p class="text-xs text-text-muted">这是最后一篇文章</p>
          </div>
        </nav>

        <!-- 评论区 -->
        <CommentSection :post-id="post.id" />
      </article>

      <!-- 悬浮 TOC（桌面端固定视口右侧、垂直居中） -->
      <!-- 祖先链无 transform/filter/will-change，fixed 相对视口生效 -->
      <aside class="hidden lg:block fixed right-4 lg:right-6 top-1/2 -translate-y-1/2 w-44 z-30">
        <div class="glass rounded-xl p-5 max-h-[65vh] overflow-y-auto">
          <p class="text-white text-sm font-bold mb-4">📑 目录</p>
          <nav v-if="toc.length > 0" class="flex flex-col gap-1.5">
            <a
              v-for="item in toc"
              :key="item.id"
              class="block text-sm py-1 transition-colors cursor-pointer border-l-2 truncate"
              :class="[
                item.level === 2 ? 'pl-0' : 'pl-4',
                activeTocId === item.id
                  ? 'text-accent-cyan border-accent-cyan'
                  : 'text-text-muted border-transparent hover:text-white',
              ]"
              @click.prevent="scrollToHeading(item.id)"
            >
              {{ item.text }}
            </a>
          </nav>
          <p v-else class="text-text-muted text-xs">暂无目录</p>
        </div>
      </aside>
    </div>

    <!-- 加载出错 -->
    <div v-else-if="error" class="text-center py-20">
      <p class="text-5xl mb-4">😵</p>
      <p class="text-text-secondary mb-2">加载文章失败</p>
      <button
        class="glass rounded-xl px-6 py-2 text-sm text-accent-cyan hover:text-white hover:bg-white/10 transition-all"
        @click="loadPost(String(route.params.slug))"
      >
        🔄 重新加载
      </button>
    </div>

    <!-- 文章不存在 -->
    <div v-else class="text-center py-20">
      <p class="text-5xl mb-4">📄</p>
      <p class="text-text-secondary">文章不存在</p>
    </div>
  </div>
</template>

<style>
/* ========== Markdown 毛玻璃暗色主题样式 ========== */
/* 注意：不带 scoped，确保作用于 v-html 渲染的内容 */

.post-content {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.85;
  font-size: 15px;
  word-break: break-word;
}

.post-content h1, .post-content h2, .post-content h3, .post-content h4 {
  color: #ffffff;
  font-weight: 700;
  margin: 1.8em 0 0.6em;
  line-height: 1.3;
}
.post-content h1 { font-size: 1.8em; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.3em; }
.post-content h2 { font-size: 1.5em; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.25em; }
.post-content h3 { font-size: 1.25em; }
.post-content h4 { font-size: 1.1em; }

.post-content p {
  margin: 0.8em 0;
}

.post-content a {
  color: #60a5fa;
  text-decoration: none;
  border-bottom: 1px dashed rgba(96, 165, 250, 0.3);
  transition: border-color 0.2s;
}
.post-content a:hover {
  border-bottom-color: #60a5fa;
}

/* 代码块 — 深色实底 + 提 z-index 防粒子遮挡 */
.post-content pre.hljs {
  background: rgba(15, 17, 23, 0.94) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
  padding: 1.2em 1.4em;
  overflow-x: auto;
  margin: 1.2em 0;
  line-height: 1.6;
  font-size: 13px;
  position: relative;
  z-index: 1;
}

/* 代码文字基础亮度提高 */
.post-content pre.hljs code {
  color: #e2e8f0;
}

/* highlight.js 语法高亮 — 暗色主题高对比度 */
.post-content .hljs-keyword { color: #c084fc; }
.post-content .hljs-string { color: #22d3ee; }
.post-content .hljs-comment { color: #6b7280; font-style: italic; }
.post-content .hljs-function { color: #60a5fa; }
.post-content .hljs-number { color: #ff6b9d; }
.post-content .hljs-built_in { color: #22d3ee; }
.post-content .hljs-title { color: #60a5fa; }
.post-content .hljs-type { color: #c084fc; }
.post-content .hljs-attr { color: #22d3ee; }
.post-content .hljs-variable { color: #ff6b9d; }
.post-content .hljs-literal { color: #ff6b9d; }
.post-content .hljs-punctuation { color: rgba(255,255,255,0.5); }

/* 行内代码 */
.post-content :not(pre) > code {
  background: rgba(255, 255, 255, 0.08);
  color: #ff6b9d;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
}

/* 引用 */
.post-content blockquote {
  border-left: 3px solid #c084fc;
  padding: 0.6em 1em;
  margin: 1em 0;
  background: rgba(192, 132, 252, 0.06);
  border-radius: 0 0.5rem 0.5rem 0;
  color: rgba(255, 255, 255, 0.6);
}

/* 列表 */
.post-content ul, .post-content ol {
  padding-left: 1.5em;
  margin: 0.8em 0;
}
.post-content li {
  margin: 0.3em 0;
}
.post-content li::marker {
  color: rgba(255, 255, 255, 0.3);
}

/* 表格 */
.post-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}
.post-content th, .post-content td {
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.6em 1em;
  text-align: left;
}
.post-content th {
  background: rgba(255, 255, 255, 0.06);
  color: #ffffff;
  font-weight: 600;
}

/* 分割线 */
.post-content hr {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 2em 0;
}

/* 图片 */
.post-content img {
  max-width: 100%;
  border-radius: 0.75rem;
  margin: 1em 0;
}

/* 强调 */
.post-content strong {
  color: #ffffff;
}
</style>
