<script setup lang="ts">
import { ref, onMounted } from "vue";
import { fetchSiteStats, type SiteStats } from "@/api/site";
import { useGsap } from "@/composables/useGsap";

const name = "HGL";
const bio = "全栈开发者 · 二次元爱好者 · 开源贡献者";
const description = "写代码、看动漫、听音乐。这里是记录技术探索和生活碎片的数字花园。";

const stats = ref<SiteStats>({ posts: 0, chatters: 0, photos: 0, friends: 0, categories: 0, tags: 0, totalViews: 0 });
const cardRef = ref<HTMLDivElement>();

const { applyTilt, resetTilt } = useGsap();

const socialLinks = [
  { icon: "🐙", label: "GitHub", url: "https://github.com" },
  { icon: "📧", label: "Email", url: "mailto:hello@hgl123.icu" },
  { icon: "🐦", label: "Twitter", url: "https://twitter.com" },
];

const statItems = [
  { label: "文章", key: "posts" as const, icon: "📝", accent: "text-accent-cyan" },
  { label: "杂谈", key: "chatters" as const, icon: "💬", accent: "text-accent-purple" },
  { label: "照片", key: "photos" as const, icon: "📷", accent: "text-accent-pink" },
];

onMounted(async () => {
  try {
    stats.value = await fetchSiteStats();
  } catch { /* keep defaults */ }
});

function onMouseMove(e: MouseEvent) {
  if (cardRef.value) applyTilt(cardRef.value, e, 6);
}

function onMouseLeave() {
  if (cardRef.value) resetTilt(cardRef.value);
}
</script>

<template>
  <!-- glass-strong: 视觉重心卡 -->
  <div ref="cardRef" class="profile-card glass-strong card-hover p-5 md:p-6 flex flex-col gap-5 h-full" style="perspective: 800px" @mousemove="onMouseMove" @mouseleave="onMouseLeave">
    <!-- 头像 + 名字 -->
    <div class="flex items-center gap-4">
      <div class="relative w-[72px] h-[72px] rounded-full bg-gradient-to-br from-accent-pink via-accent-purple to-accent-blue p-[2.5px] shrink-0">
        <div class="w-full h-full rounded-full bg-[#1a1a2e] flex items-center justify-center text-[28px] font-bold text-white">
          {{ name[0] }}
        </div>
      </div>
      <div>
        <h3 class="text-white text-xl font-bold tracking-tight">{{ name }}</h3>
        <p class="text-text-muted text-[13px] mt-0.5">{{ bio }}</p>
      </div>
    </div>

    <!-- 简介 -->
    <p class="text-text-secondary text-[13px] leading-relaxed">
      {{ description }}
    </p>

    <!-- 统计数据：3 等分 -->
    <div class="grid grid-cols-3 gap-2">
      <div
        v-for="stat in statItems"
        :key="stat.label"
        class="glass rounded-xl p-3 text-center group/stat"
      >
        <div class="text-base mb-0.5">{{ stat.icon }}</div>
        <div class="text-white font-bold text-xl" :class="stat.accent">
          {{ stats[stat.key] }}
        </div>
        <div class="text-text-muted text-[11px]">{{ stat.label }}</div>
      </div>
    </div>

    <!-- 社交链接 -->
    <div class="flex gap-2 mt-auto">
      <a
        v-for="link in socialLinks"
        :key="link.label"
        :href="link.url"
        target="_blank"
        rel="noopener"
        class="glass rounded-lg px-3 py-2 text-[13px] text-text-secondary hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
        :title="link.label"
      >
        <span>{{ link.icon }}</span>
        <span class="hidden lg:inline">{{ link.label }}</span>
      </a>
    </div>
  </div>
</template>
