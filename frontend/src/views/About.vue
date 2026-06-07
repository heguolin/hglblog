<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import gsap from "gsap";
import client from "@/api/client";
import CommentSection from "@/components/common/CommentSection.vue";
import { useSEO } from "@/composables/useSEO";
useSEO("关于我");

const activeTab = ref<"intro" | "activity">("intro");
const bio = ref("");
const avatarUrl = ref<string | null>(null);
const loading = ref(true);
const bannerRef = ref<HTMLElement>();

// banner 背景图（可替换为图床 URL）
const bannerImage = "https://picsum.photos/seed/anime-banner/1200/400";

const tabItems = [
  { key: "intro" as const, label: "自我介绍" },
  { key: "activity" as const, label: "研究动态" },
];

onMounted(async () => {
  // 加载 bio
  try {
    const { data } = await client.get("/site/config/bio");
    bio.value = JSON.parse(data.value);
  } catch {
    bio.value = "写代码、看动漫、听音乐。这里是记录技术探索和生活碎片的数字花园。";
  } finally {
    loading.value = false;
  }
  // 加载头像（公开接口）
  try {
    const { data } = await client.get("/site/config/avatar");
    avatarUrl.value = JSON.parse(data.value);
  } catch { /* 无头像则保持 null */ }

  // banner 入场动画
  nextTick(() => {
    if (bannerRef.value) {
      gsap.fromTo(bannerRef.value, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out" });
      gsap.fromTo(".about-hero-item", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, delay: 0.3, ease: "power2.out" });
    }
  });
});
</script>

<template>
  <div class="page-container">
    <!-- ====== Hero Banner（wrapping 容器，不裁切溢出） ====== -->
    <div ref="bannerRef" class="relative pb-12 md:pb-16">
      <!-- Banner 背景层（overflow-hidden 裁切圆角） -->
      <section class="relative rounded-2xl overflow-hidden h-56 md:h-72 lg:h-80">
        <img :src="bannerImage" alt="" class="absolute inset-0 w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-[#0f0c29]/95 via-[#0f0c29]/30 to-transparent" />
      </section>

      <!-- 头像 + 标题（骑在 banner 下边界上） -->
      <div class="absolute left-8 md:left-12 bottom-0 flex items-end gap-4 md:gap-5">
        <div class="about-hero-item w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full border-[3px] border-white/20 shadow-xl shadow-black/40 shrink-0 overflow-hidden bg-[#1a1a2e]">
          <img v-if="avatarUrl" :src="avatarUrl" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-3xl md:text-4xl font-bold text-white">H</div>
        </div>
        <div class="about-hero-item pb-1 md:pb-2">
          <h1 class="text-2xl md:text-3xl lg:text-4xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">关于我</h1>
          <p class="text-accent-purple text-[11px] md:text-xs tracking-[0.15em] uppercase mt-0.5 font-semibold">HELLO WORLD, I&apos;M HGL</p>
        </div>
      </div>
    </div>

    <!-- 分段切换按钮 -->
    <div class="flex justify-end mb-8">
      <div class="about-hero-item glass rounded-xl p-1 flex gap-0.5">
        <button
          v-for="tab in tabItems"
          :key="tab.key"
          class="relative px-5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-300"
          :class="activeTab === tab.key ? 'text-white' : 'text-text-muted hover:text-white'"
          @click="activeTab = tab.key"
        >
          <span v-if="activeTab === tab.key" class="absolute inset-0 bg-accent-purple rounded-lg -z-10" />
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- ====== Tab: 自我介绍 ====== -->
    <!-- 用 flex flex-col gap-8 替代 space-y-10，gap 不受 margin 折叠/覆盖影响 -->
    <div v-if="activeTab === 'intro'" class="flex flex-col gap-6 md:gap-8">
      <div v-if="loading" class="glass rounded-xl p-8 animate-pulse">
        <div class="h-4 w-full bg-white/5 rounded mb-2" />
        <div class="h-4 w-3/4 bg-white/5 rounded" />
      </div>
      <div v-else class="glass rounded-xl p-6 md:p-8">
        <h2 class="text-xl font-bold text-white mb-4">关于我</h2>
        <div class="text-text-secondary leading-relaxed whitespace-pre-wrap text-[15px]">
          {{ bio }}
        </div>
      </div>
      <!-- Waline 评论区 -->
      <CommentSection :post-id="0" />
    </div>

    <!-- Tab: 研究动态 -->
    <div v-else class="glass rounded-xl p-8 text-center">
      <p class="text-4xl mb-4">📡</p>
      <p class="text-text-secondary">动态功能开发中，敬请期待...</p>
      <p class="text-text-muted text-xs mt-2">将展示 GitHub 动态、近期活动等</p>
    </div>
  </div>
</template>
