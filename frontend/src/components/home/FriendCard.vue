<script setup lang="ts">
export interface FriendData {
  id: number;
  name: string;
  url: string;
  avatar: string | null;
  description: string | null;
  approved: boolean;
}

import LazyImage from "@/components/common/LazyImage.vue";

defineProps<{
  friend: FriendData;
}>();
</script>

<template>
  <a
    :href="friend.url"
    target="_blank"
    rel="noopener noreferrer"
    class="glass card-hover p-5 md:p-6 flex flex-col items-center gap-4 text-center group"
  >
    <!-- 在线状态徽章 -->
    <div class="self-end glass rounded-full px-2.5 py-0.5 flex items-center gap-1.5 text-[11px]">
      <span class="w-[6px] h-[6px] rounded-full bg-green-400" />
      <span class="text-text-muted">Online</span>
    </div>

    <!-- 头像 -->
    <div class="w-20 h-20 rounded-full border-2 border-white/10 shrink-0 overflow-hidden bg-white/5 transition-transform duration-300 group-hover:scale-110">
      <LazyImage
        v-if="friend.avatar"
        :src="friend.avatar"
        :alt="friend.name"
        aspect-ratio="1/1"
        :thumb-width="100"
        class="rounded-full"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-2xl font-bold text-accent-cyan">
        {{ friend.name[0] || '?' }}
      </div>
    </div>

    <!-- 名称 -->
    <h3 class="text-white font-bold text-sm md:text-base truncate w-full group-hover:text-accent-cyan transition-colors">
      {{ friend.name }}
    </h3>

    <!-- 简介 -->
    <p class="text-text-secondary text-xs md:text-[13px] leading-relaxed line-clamp-2 w-full">
      {{ friend.description || '这位友邻还没有填写简介~' }}
    </p>
  </a>
</template>
