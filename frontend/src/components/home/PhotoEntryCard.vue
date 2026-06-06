<script setup lang="ts">
import { ref, onMounted } from "vue";
import { fetchAlbums, type Album } from "@/api/albums";

const album = ref<Album | null>(null);
const totalPhotos = ref(0);
const loading = ref(true);

onMounted(async () => {
  try {
    const albums = await fetchAlbums();
    if (albums.length > 0) {
      album.value = albums[0];
      totalPhotos.value = albums.reduce((sum, a) => sum + (a.photoCount ?? 0), 0);
    }
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <!-- 加载骨架 -->
  <div v-if="loading" class="photo-entry-card glass card-hover p-5 md:p-6 flex flex-col gap-4 h-full animate-pulse">
    <div class="relative h-40">
      <div class="absolute top-2 left-0 right-2 h-full rounded-xl bg-white/5" />
    </div>
    <div class="space-y-2 text-center">
      <div class="h-5 w-2/3 mx-auto bg-white/10 rounded" />
      <div class="h-3 w-full bg-white/10 rounded" />
      <div class="h-3 w-16 mx-auto bg-white/10 rounded" />
    </div>
  </div>

  <!-- 空 -->
  <div v-else-if="!album" class="photo-entry-card glass card-hover p-6 flex items-center justify-center h-full">
    <p class="text-text-muted text-sm">还没有照片</p>
  </div>

  <!-- 照片入口卡片 -->
  <router-link
    v-else
    to="/photowall"
    class="photo-entry-card glass card-hover p-5 md:p-6 flex flex-col gap-4 h-full group block"
  >
    <!-- 三图堆叠预览 -->
    <div class="relative h-40">
      <!-- 底 -->
      <div class="absolute top-0 left-3 right-3 h-full rounded-xl bg-white/[0.03] border border-white/5 rotate-[2.5deg]" />
      <!-- 中 -->
      <div class="absolute top-1.5 left-1.5 right-1.5 h-full rounded-xl bg-white/[0.06] border border-white/5 -rotate-[1.5deg]" />
      <!-- 顶 — 真图 -->
      <div class="absolute top-3 left-0 right-3 h-full rounded-xl overflow-hidden bg-gradient-to-br from-accent-pink/30 via-accent-purple/30 to-accent-blue/30 shadow-lg shadow-black/20">
        <img
          v-if="album.coverImage"
          :src="album.coverImage"
          :alt="album.name"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div v-else class="w-full h-full flex items-center justify-center text-5xl">🌸</div>
      </div>
    </div>

    <!-- 信息 -->
    <div class="space-y-1 text-center">
      <h3 class="text-white text-base font-bold group-hover:text-accent-pink transition-colors">
        {{ album.name }}
      </h3>
      <p class="text-text-secondary text-[13px] leading-relaxed line-clamp-2">
        {{ album.description }}
      </p>
      <p class="text-accent-cyan text-[12px] font-medium mt-1">
        浏览 {{ totalPhotos }} 张照片 →
      </p>
    </div>
  </router-link>
</template>
