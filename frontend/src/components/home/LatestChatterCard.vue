<script setup lang="ts">
import { ref, onMounted } from "vue";
import dayjs from "dayjs";
import { fetchChatters, type Chatter } from "@/api/chatters";

const chatter = ref<Chatter | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const res = await fetchChatters();
    chatter.value = res.chatters[0] ?? null;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <!-- 加载骨架 -->
  <div v-if="loading" class="latest-chatter-card glass card-hover p-5 md:p-6 flex gap-5 h-full animate-pulse">
    <div class="shrink-0 w-[60px] h-[60px] rounded-2xl bg-white/5" />
    <div class="flex-1 space-y-3">
      <div class="h-3 w-16 bg-white/10 rounded" />
      <div class="h-5 w-3/4 bg-white/10 rounded" />
      <div class="h-4 w-full bg-white/10 rounded" />
    </div>
  </div>

  <!-- 空 -->
  <div v-else-if="!chatter" class="latest-chatter-card glass card-hover p-6 flex items-center justify-center h-full">
    <p class="text-text-muted text-sm">还没有杂谈</p>
  </div>

  <!-- 杂谈卡片 -->
  <router-link
    v-else
    :to="`/chatter/${chatter.id}`"
    class="latest-chatter-card glass card-hover p-5 md:p-6 flex gap-5 h-full group block"
  >
    <!-- 心情表情 — 加大 -->
    <div class="shrink-0 w-[60px] h-[60px] rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-center text-[32px] select-none">
      {{ chatter.mood || "💬" }}
    </div>

    <!-- 内容 -->
    <div class="flex flex-col gap-2 min-w-0 flex-1">
      <div class="flex items-center gap-3">
        <p class="text-accent-purple text-[11px] font-semibold tracking-[0.12em] uppercase">Records</p>
        <span class="text-text-muted text-[12px]">{{ dayjs(chatter.createdAt).format("MM/DD HH:mm") }}</span>
      </div>
      <h3 class="text-white text-base font-bold group-hover:text-accent-purple transition-colors line-clamp-1">
        {{ chatter.title }}
      </h3>
      <p class="text-text-secondary text-[13px] leading-relaxed line-clamp-2">
        {{ chatter.content }}
      </p>
      <div class="flex gap-2 mt-1">
        <span
          v-for="tag in chatter.tags"
          :key="tag"
          class="px-2 py-[2px] text-[11px] rounded-full bg-white/5 border border-white/10 text-text-muted"
        >
          #{{ tag }}
        </span>
      </div>
    </div>
  </router-link>
</template>
