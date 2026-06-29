<script setup lang="ts">
import { useSEO } from "@/composables/useSEO";
import { ref, onMounted, onUnmounted } from "vue";
import dayjs from "dayjs";
import { fetchAlbums, fetchAlbumById, type Album, type Photo } from "@/api/albums";
import LazyImage from "@/components/common/LazyImage.vue";

const albums = ref<Album[]>([]);
const loading = ref(true);

// 选中相册
const selectedAlbum = ref<(Album & { photos: Photo[] }) | null>(null);
const albumLoading = ref(false);

// 灯箱
const lightboxOpen = ref(false);
const lightboxPhotos = ref<Photo[]>([]);
const lightboxIndex = ref(0);

async function loadAlbums() {
  loading.value = true;
  try {
    albums.value = await fetchAlbums();
  } finally {
    loading.value = false;
  }
}

async function openAlbum(albumId: number) {
  albumLoading.value = true;
  try {
    selectedAlbum.value = await fetchAlbumById(albumId);
    window.scrollTo({ top: document.getElementById("album-grid")?.offsetTop ?? 0, behavior: "smooth" });
  } finally {
    albumLoading.value = false;
  }
}

function closeAlbum() {
  selectedAlbum.value = null;
}

function openLightbox(photos: Photo[], index: number) {
  lightboxPhotos.value = photos;
  lightboxIndex.value = index;
  lightboxOpen.value = true;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightboxOpen.value = false;
  document.body.style.overflow = "";
}

function prevImage() {
  if (lightboxIndex.value > 0) lightboxIndex.value--;
}

function nextImage() {
  if (lightboxIndex.value < lightboxPhotos.value.length - 1) lightboxIndex.value++;
}

function onKeydown(e: KeyboardEvent) {
  if (!lightboxOpen.value) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") prevImage();
  if (e.key === "ArrowRight") nextImage();
}

onMounted(() => {
  useSEO("PhotoWall");
  loadAlbums();
  window.addEventListener("keydown", onKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div class="page-container">
    <!-- 标题区 -->
    <div class="mb-8 text-center">
      <p class="page-label">Gallery</p>
      <h1 class="text-3xl md:text-4xl font-bold text-white">📷 光影画廊</h1>
      <p class="text-text-muted mt-2">用镜头记录生活的每一个瞬间</p>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div v-for="i in 2" :key="i" class="glass rounded-xl h-64 animate-pulse" />
    </div>

    <!-- 空状态 -->
    <div v-else-if="albums.length === 0" class="text-center py-20">
      <p class="text-5xl mb-4">📷</p>
      <p class="text-text-secondary">还没有相册</p>
    </div>

    <!-- 相册卡片网格 -->
    <div v-else id="album-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="album in albums"
        :key="album.id"
        class="glass card-hover p-6 flex flex-col gap-4 cursor-pointer group"
        @click="openAlbum(album.id)"
      >
        <!-- 多图堆叠预览 -->
        <div class="relative h-44">
          <div class="absolute top-0 left-3 right-3 h-full rounded-lg bg-white/5 rotate-2" />
          <div class="absolute top-1 left-1 right-1 h-full rounded-lg bg-white/10 -rotate-1" />
          <div class="absolute top-2 left-0 right-2 h-full rounded-lg overflow-hidden bg-gradient-to-br from-accent-pink/30 via-accent-purple/30 to-accent-blue/30">
            <LazyImage
              v-if="album.coverImage"
              :src="album.coverImage"
              :alt="album.name"
              aspect-ratio="16/9"
              class="rounded-lg"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-4xl">🖼️</div>
          </div>
        </div>

        <!-- 信息 -->
        <div>
          <h3 class="text-white text-lg font-bold group-hover:text-accent-pink transition-colors">
            {{ album.name }}
          </h3>
          <p class="text-text-secondary text-sm mt-1 line-clamp-2">
            {{ album.description }}
          </p>
          <div class="flex items-center gap-3 mt-3 text-xs text-text-muted">
            <span>{{ dayjs(album.date).format("YYYY/MM/DD") }}</span>
            <span>📸 {{ album.photoCount ?? 0 }} 张照片</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 相册详情（照片网格） ========== -->
    <div v-if="selectedAlbum" class="mt-10">
      <!-- 返回 -->
      <button
        class="inline-flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-6 text-sm"
        @click="closeAlbum"
      >
        <span>←</span> 返回相册列表
      </button>

      <div v-if="albumLoading" class="animate-pulse space-y-4">
        <div class="h-6 w-1/3 bg-white/10 rounded" />
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div v-for="i in 5" :key="i" class="aspect-square rounded-xl bg-white/5" />
        </div>
      </div>

      <div v-else>
        <h2 class="text-2xl font-bold text-white mb-2">{{ selectedAlbum.name }}</h2>
        <p class="text-text-secondary mb-6">{{ selectedAlbum.description }}</p>

        <!-- 照片网格 -->
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div
            v-for="(photo, i) in selectedAlbum.photos"
            :key="photo.id"
            class="relative aspect-square rounded-xl overflow-hidden bg-white/5 cursor-pointer group"
            @click="openLightbox(selectedAlbum.photos, i)"
          >
            <LazyImage
              :src="photo.thumbnail || photo.url"
              :alt="photo.title || ''"
              aspect-ratio="1/1"
              class="rounded-xl"
            />
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <span class="text-white opacity-0 group-hover:opacity-100 transition-opacity text-xl">{{ photo.title || "📷" }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========== 灯箱 ========== -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div
          v-if="lightboxOpen && lightboxPhotos.length > 0"
          class="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          @click.self="closeLightbox"
        >
          <!-- 关闭 -->
          <button class="absolute top-4 right-4 text-white/60 hover:text-white text-3xl z-10 p-2" @click="closeLightbox">✕</button>
          <!-- 计数 + 标题 -->
          <div class="absolute top-4 left-4 text-white/80 text-sm z-10">
            {{ lightboxIndex + 1 }} / {{ lightboxPhotos.length }}
            <span v-if="lightboxPhotos[lightboxIndex]?.title" class="ml-2 text-white/50">
              — {{ lightboxPhotos[lightboxIndex].title }}
            </span>
          </div>
          <!-- 上一张 -->
          <button v-if="lightboxIndex > 0" class="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-5xl z-10 p-2 transition-colors" @click.stop="prevImage">‹</button>
          <!-- 图片 -->
          <LazyImage
            :src="lightboxPhotos[lightboxIndex]?.url"
            :alt="lightboxPhotos[lightboxIndex]?.title || ''"
            :blur-up="false"
            object-fit="contain"
            class="max-w-[92vw] max-h-[88vh] rounded-lg"
          />
          <!-- 下一张 -->
          <button v-if="lightboxIndex < lightboxPhotos.length - 1" class="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-5xl z-10 p-2 transition-colors" @click.stop="nextImage">›</button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.lightbox-enter-active,
.lightbox-leave-active {
  transition: opacity 0.3s ease;
}
.lightbox-enter-from,
.lightbox-leave-to {
  opacity: 0;
}
</style>
