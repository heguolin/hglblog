<script setup lang="ts">
import { ref, onMounted } from "vue";
import dayjs from "dayjs";
import { fetchSiteStats, type SiteStats } from "@/api/site";
import { fetchRecentPosts, type Post } from "@/api/posts";

const stats = ref<SiteStats>({ posts: 0, chatters: 0, photos: 0, friends: 0, categories: 0, tags: 0, totalViews: 0 });
const recentPosts = ref<Post[]>([]);
const loading = ref(true);

const statCards = [
  { label: "文章", value: () => stats.value.posts, color: "from-accent-cyan to-accent-blue", icon: "📝" },
  { label: "杂谈", value: () => stats.value.chatters, color: "from-accent-purple to-accent-pink", icon: "💬" },
  { label: "照片", value: () => stats.value.photos, color: "from-accent-pink to-accent-purple", icon: "📷" },
  { label: "总浏览", value: () => stats.value.totalViews, color: "from-accent-blue to-accent-cyan", icon: "👀" },
];

onMounted(async () => {
  try {
    const [s, posts] = await Promise.all([
      fetchSiteStats(),
      fetchRecentPosts(5),
    ]);
    stats.value = s;
    recentPosts.value = posts;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="max-w-[1200px] mx-auto flex flex-col gap-10">
    <!-- 页面标题 -->
    <div>
      <h1 class="text-2xl font-bold text-white">📊 仪表盘</h1>
      <p class="text-text-muted text-sm mt-2">博客数据一览</p>
    </div>

    <!-- ====== 统计卡片 ====== -->
    <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div v-for="i in 4" :key="i" class="glass rounded-xl h-32 animate-pulse" />
    </div>
    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-6">
      <div
        v-for="card in statCards"
        :key="card.label"
        class="glass-strong rounded-xl p-6 flex flex-col gap-3"
      >
        <div class="flex items-center justify-between">
          <span class="text-text-muted text-[11px] font-semibold tracking-wider uppercase">{{ card.label }}</span>
          <span class="text-2xl">{{ card.icon }}</span>
        </div>
        <p class="text-white text-[32px] font-bold tracking-tight leading-none">{{ card.value().toLocaleString() }}</p>
        <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <div class="h-full rounded-full bg-gradient-to-r" :class="card.color" />
        </div>
      </div>
    </div>

    <!-- ====== 快捷入口 ====== -->
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <router-link to="/admin/posts/new" class="glass card-hover rounded-xl p-5 text-center text-sm text-text-secondary hover:text-white hover:bg-white/[0.06] transition-colors flex flex-col items-center gap-2">
        <span class="text-2xl">✏️</span>
        <span>写文章</span>
      </router-link>
      <router-link to="/admin/chatters" class="glass card-hover rounded-xl p-5 text-center text-sm text-text-secondary hover:text-white hover:bg-white/[0.06] transition-colors flex flex-col items-center gap-2">
        <span class="text-2xl">💬</span>
        <span>发杂谈</span>
      </router-link>
      <router-link to="/admin/albums" class="glass card-hover rounded-xl p-5 text-center text-sm text-text-secondary hover:text-white hover:bg-white/[0.06] transition-colors flex flex-col items-center gap-2">
        <span class="text-2xl">📷</span>
        <span>管相册</span>
      </router-link>
      <router-link to="/admin/friends" class="glass card-hover rounded-xl p-5 text-center text-sm text-text-secondary hover:text-white hover:bg-white/[0.06] transition-colors flex flex-col items-center gap-2">
        <span class="text-2xl">🔗</span>
        <span>审友链</span>
      </router-link>
      <router-link to="/admin/settings" class="glass card-hover rounded-xl p-5 text-center text-sm text-text-secondary hover:text-white hover:bg-white/[0.06] transition-colors flex flex-col items-center gap-2">
        <span class="text-2xl">⚙️</span>
        <span>设 置</span>
      </router-link>
    </div>

    <!-- ====== 最近文章 ====== -->
    <div class="glass rounded-xl p-6 md:p-8">
      <h2 class="text-white text-base font-bold mb-5">📝 最近文章</h2>
      <div v-if="recentPosts.length === 0" class="text-text-muted text-sm text-center py-8">
        还没有文章
      </div>
      <div v-else class="flex flex-col gap-1 divide-y divide-white/[0.04]">
        <div
          v-for="post in recentPosts"
          :key="post.id"
          class="flex items-center justify-between py-3.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <span v-if="post.pinned" class="text-accent-pink shrink-0">📌</span>
            <span class="text-text-secondary text-sm truncate">{{ post.title }}</span>
          </div>
          <div class="flex items-center gap-5 shrink-0 ml-4">
            <span v-if="post.category" class="text-text-muted text-xs hidden md:inline">{{ post.category.icon }} {{ post.category.name }}</span>
            <span class="text-text-muted text-xs hidden sm:inline">{{ dayjs(post.createdAt).format("MM/DD") }}</span>
            <span class="text-text-muted text-xs">👀 {{ post.viewCount }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
