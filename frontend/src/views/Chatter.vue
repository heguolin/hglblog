<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue";
import gsap from "gsap";
import { fetchChatters, type Chatter } from "@/api/chatters";
import ChatterCard from "@/components/home/ChatterCard.vue";
import { useSEO } from "@/composables/useSEO";

useSEO("杂谈");

const chatters = ref<Chatter[]>([]);
const total = ref(0);
const allTags = ref<string[]>([]);
const activeTag = ref("");
const searchQuery = ref("");
const loading = ref(true);

// 客户端筛选后的结果
const filteredChatters = ref<Chatter[]>([]);

function applyFilters() {
  let result = chatters.value;
  if (activeTag.value) {
    result = result.filter((c) => c.tags.includes(activeTag.value));
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    result = result.filter(
      (c) => c.title.toLowerCase().includes(q) || c.content.toLowerCase().includes(q),
    );
  }
  filteredChatters.value = result;
}

watch([activeTag, searchQuery], () => applyFilters());

async function loadChatters(tag?: string) {
  loading.value = true;
  try {
    const res = await fetchChatters(tag);
    chatters.value = res.chatters;
    total.value = res.total;
    allTags.value = res.allTags;
    applyFilters();
  } finally {
    loading.value = false;
    // Hero 元素 stagger 淡入
    nextTick(() => {
      gsap.fromTo(".hero-item", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power2.out" });
    });
  }
}

function selectTag(tag: string) {
  activeTag.value = activeTag.value === tag ? "" : tag;
}

onMounted(() => {
  loadChatters();
});
</script>

<template>
  <div class="page-container">
    <!-- ====== Hero 头图区 ====== -->
    <section class="py-16 md:py-20 lg:py-24 text-center space-y-8">
      <!-- 主标题 -->
      <h1 class="hero-item text-4xl md:text-5xl font-extrabold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
        ☁️ 云端杂谈
      </h1>

      <!-- 副标题 -->
      <p class="hero-item text-text-muted text-sm md:text-base">
        记录日常灵感与技术碎碎念，共 {{ total }} 条
      </p>

      <!-- 胶囊搜索框 -->
      <div class="hero-item flex justify-center mt-8">
        <div class="glass rounded-full h-14 px-6 flex items-center gap-3 w-full max-w-md md:max-w-xl lg:max-w-2xl">
          <span class="text-text-muted shrink-0 text-lg">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜寻被遗忘的思绪…"
            class="flex-1 bg-transparent text-white text-sm md:text-base outline-none placeholder:text-text-muted"
          />
        </div>
      </div>

      <!-- 标签筛选栏 -->
      <div class="hero-item flex flex-wrap justify-center gap-2.5 mt-6">
        <button
          class="px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300"
          :class="activeTag === ''
            ? 'bg-accent-purple text-white shadow-lg shadow-accent-purple/20'
            : 'glass text-text-secondary hover:text-white hover:bg-white/[0.08]'"
          @click="activeTag = ''"
        >
          全部
        </button>
        <button
          v-for="tag in allTags"
          :key="tag"
          class="px-5 py-2.5 rounded-full text-sm transition-all duration-300"
          :class="activeTag === tag
            ? 'bg-accent-cyan/30 text-accent-cyan border border-accent-cyan/30 shadow-lg shadow-accent-cyan/10'
            : 'glass text-text-secondary hover:text-white hover:bg-white/[0.08]'"
          @click="selectTag(tag)"
        >
          #{{ tag }}
        </button>
      </div>
    </section>

    <!-- ====== 加载骨架 ====== -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 6" :key="i" class="glass rounded-xl h-72 animate-pulse overflow-hidden">
        <div class="h-44 bg-white/[0.02]" />
        <div class="p-4 space-y-3">
          <div class="h-3 w-24 bg-white/[0.05] rounded-full" />
          <div class="h-5 w-3/4 bg-white/[0.05] rounded" />
          <div class="h-4 w-full bg-white/[0.05] rounded" />
        </div>
      </div>
    </div>

    <!-- ====== 空状态 ====== -->
    <div v-else-if="filteredChatters.length === 0" class="text-center py-20">
      <p class="text-5xl mb-4">💬</p>
      <p class="text-text-secondary text-lg">
        {{ searchQuery ? '没有找到匹配的杂谈' : '还没有杂谈' }}
      </p>
    </div>

    <!-- ====== 卡片网格 ====== -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="(chatter, idx) in filteredChatters"
        :key="chatter.id"
        class="chatter-card-wrapper"
        :style="{ animationDelay: `${idx * 60}ms` }"
      >
        <ChatterCard :chatter="chatter" :index="idx" />
      </div>
    </div>
  </div>
</template>

<style>
/* 卡片入场动画 — stagger 错峰淡入上浮 */
.chatter-card-wrapper {
  animation: chatter-fade-in 0.5s ease both;
}
@keyframes chatter-fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
