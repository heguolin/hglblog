<script setup lang="ts">
import dayjs from "dayjs";
import LazyImage from "@/components/common/LazyImage.vue";

export interface ChatterCardData {
  id: number;
  title: string;
  content: string;
  mood: string | null;
  coverImage: string | null;
  tags: string[];
  createdAt: string;
}

defineProps<{
  chatter: ChatterCardData;
  index: number;
}>();
</script>

<template>
  <router-link
    :to="`/chatter/${chatter.id}`"
    class="chatter-card glass card-hover flex flex-col group overflow-hidden"
    :style="{ animationDelay: `${index * 0.06}s` }"
  >
    <!-- 封面图区域 -->
    <div class="relative h-44 overflow-hidden">
      <LazyImage
        v-if="chatter.coverImage"
        :src="chatter.coverImage"
        :alt="chatter.title"
        aspect-ratio="16/9"
        class="rounded-t-xl"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-accent-purple/15 via-accent-blue/10 to-accent-pink/15"
      >
        💬
      </div>
      <!-- 渐变遮罩 -->
      <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0f0c29]/80 to-transparent pointer-events-none" />

      <!-- 心情徽章 -->
      <div
        v-if="chatter.mood"
        class="absolute top-3 right-3 glass rounded-full px-3 py-1 text-xs text-white/90 backdrop-blur-md flex items-center gap-1"
      >
        <span>{{ chatter.mood }}</span>
      </div>
    </div>

    <!-- 正文区 -->
    <div class="p-4 flex flex-col gap-3 flex-1">
      <!-- 时间戳 -->
      <p class="text-[11px] font-mono text-text-muted bg-white/[0.03] rounded-full px-3 py-0.5 inline-block w-fit">
        {{ dayjs(chatter.createdAt).format("YYYY-MM-DD HH:mm:ss") }}
      </p>

      <!-- 标题 -->
      <h3 class="text-white text-base font-bold leading-snug line-clamp-2 group-hover:text-accent-cyan transition-colors">
        {{ chatter.title }}
      </h3>

      <!-- 摘要 -->
      <p class="text-text-secondary text-[13px] leading-relaxed line-clamp-3 flex-1">
        {{ chatter.content }}
      </p>

      <!-- 标签 -->
      <div class="flex flex-wrap gap-1.5 mt-auto">
        <span
          v-for="tag in chatter.tags"
          :key="tag"
          class="px-2 py-0.5 text-[11px] rounded-full bg-white/[0.04] border border-white/[0.06] text-text-muted"
        >
          #{{ tag }}
        </span>
      </div>
    </div>
  </router-link>
</template>
