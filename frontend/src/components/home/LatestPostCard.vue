<script setup lang="ts">
import { ref, onMounted } from "vue";
import dayjs from "dayjs";
import { fetchRecentPosts, type Post } from "@/api/posts";
import LazyImage from "@/components/common/LazyImage.vue";

const post = ref<Post | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const posts = await fetchRecentPosts(1);
    post.value = posts[0] ?? null;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <!-- 加载骨架 -->
  <div v-if="loading" class="latest-post-card glass-strong card-hover p-5 md:p-6 flex flex-col gap-4 h-full animate-pulse">
    <div class="w-full h-48 rounded-xl bg-white/5" />
    <div class="space-y-2">
      <div class="h-3 w-20 bg-white/10 rounded" />
      <div class="h-6 w-full bg-white/10 rounded" />
      <div class="h-4 w-3/4 bg-white/10 rounded" />
    </div>
  </div>

  <!-- 空状态 -->
  <div v-else-if="!post" class="latest-post-card glass-strong card-hover p-6 flex items-center justify-center h-full">
    <p class="text-text-muted text-sm">还没有文章</p>
  </div>

  <!-- 文章卡片 — glass-strong 视觉重心 -->
  <router-link
    v-else
    :to="`/posts/${post.slug}`"
    class="latest-post-card glass-strong card-hover p-5 md:p-6 flex flex-col gap-4 h-full group block"
  >
    <!-- 封面图 — 加高到 h-52 增强视觉权重 -->
    <div class="relative w-full h-44 md:h-52 rounded-xl overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-accent-purple/20 to-accent-blue/10">
      <LazyImage
        v-if="post.coverImage"
        :src="post.coverImage"
        :alt="post.title"
        aspect-ratio="16/9"
        :thumb-width="400"
        class="absolute inset-0 rounded-xl"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-6xl">📝</div>
      <!-- 渐变遮罩 -->
      <div class="absolute inset-0 bg-gradient-to-t from-[#0f0c29]/90 via-transparent to-transparent" />
      <!-- 分类标签 -->
      <div v-if="post.category" class="absolute top-4 left-4">
        <span
          class="glass rounded-full px-3 py-1 text-[12px] text-white font-medium backdrop-blur-md"
          :style="{ borderColor: post.category.color || 'rgba(255,255,255,0.15)' }"
        >
          {{ post.category.icon }} {{ post.category.name }}
        </span>
      </div>
      <!-- 封面上的标题 -->
      <div class="absolute bottom-4 left-4 right-4">
        <p class="text-accent-cyan text-[11px] font-semibold tracking-[0.15em] uppercase mb-1.5">Latest Insight</p>
        <h3 class="text-white text-lg md:text-xl font-bold leading-snug line-clamp-2 group-hover:text-accent-cyan transition-colors">
          {{ post.title }}
        </h3>
      </div>
    </div>

    <!-- 摘要 -->
    <p class="text-text-secondary text-[13px] leading-relaxed line-clamp-2">
      {{ post.excerpt || post.content.replace(/[#*`\[\]()>!\-_~\n\r]/g, "").slice(0, 150) }}
    </p>

    <!-- 底部 meta + 标签 -->
    <div class="flex items-center justify-between mt-auto">
      <div class="flex items-center gap-3 text-[12px] text-text-muted">
        <span>{{ dayjs(post.createdAt).format("YYYY / MM / DD") }}</span>
        <span v-if="post.readingTime">· 📖 {{ post.readingTime }} 分钟</span>
        <span>· 👀 {{ post.viewCount.toLocaleString() }}</span>
      </div>
      <div class="hidden md:flex gap-1.5">
        <span
          v-for="tag in post.tags"
          :key="tag.id"
          class="px-2 py-[3px] text-[11px] rounded-full bg-white/5 border border-white/10 text-text-muted"
        >
          #{{ tag.name }}
        </span>
      </div>
    </div>
  </router-link>
</template>
