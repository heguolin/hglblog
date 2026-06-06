<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import dayjs from "dayjs";
import { fetchChatterById, type Chatter } from "@/api/chatters";

const route = useRoute();

const chatter = ref<Chatter | null>(null);
const loading = ref(true);
const error = ref(false);

// 灯箱
const lightboxOpen = ref(false);
const lightboxIndex = ref(0);

function openLightbox(index: number) {
  lightboxIndex.value = index;
  lightboxOpen.value = true;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightboxOpen.value = false;
  document.body.style.overflow = "";
}

function prevImage() {
  if (chatter.value && lightboxIndex.value > 0) {
    lightboxIndex.value--;
  }
}

function nextImage() {
  if (chatter.value && lightboxIndex.value < chatter.value.images.length - 1) {
    lightboxIndex.value++;
  }
}

function onKeydown(e: KeyboardEvent) {
  if (!lightboxOpen.value) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") prevImage();
  if (e.key === "ArrowRight") nextImage();
}

async function loadChatter(id: number) {
  loading.value = true;
  error.value = false;
  chatter.value = null;
  try {
    chatter.value = await fetchChatterById(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadChatter(Number(route.params.id));
  window.addEventListener("keydown", onKeydown);
});

watch(() => route.params.id, (newId) => {
  if (newId) loadChatter(Number(newId));
});
</script>

<template>
  <div class="page-container">
    <!-- 返回按钮 -->
    <router-link to="/chatter" class="inline-flex items-center gap-2 text-text-muted hover:text-white transition-colors mb-6 text-sm">
      <span>←</span> 返回杂谈列表
    </router-link>

    <!-- 加载中 -->
    <div v-if="loading" class="animate-pulse space-y-4 max-w-3xl mx-auto">
      <div class="h-8 w-1/3 bg-white/10 rounded" />
      <div class="h-4 w-1/4 bg-white/10 rounded" />
      <div class="h-60 bg-white/5 rounded-xl" />
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="text-center py-20">
      <p class="text-5xl mb-4">😵</p>
      <p class="text-text-secondary mb-2">加载杂谈失败</p>
      <button
        class="glass rounded-xl px-6 py-2 text-sm text-accent-cyan hover:text-white hover:bg-white/10 transition-all"
        @click="loadChatter(Number(route.params.id))"
      >
        🔄 重新加载
      </button>
    </div>

    <!-- 杂谈内容 -->
    <article v-else-if="chatter" class="max-w-3xl mx-auto">
      <!-- 心情 + 标题 -->
      <header class="mb-8">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-4xl select-none">
            {{ chatter.mood || "💬" }}
          </div>
          <div>
            <h1 class="text-2xl md:text-3xl font-bold text-white">{{ chatter.title }}</h1>
            <div class="flex items-center gap-3 mt-2 text-sm text-text-muted">
              <span>{{ dayjs(chatter.createdAt).format("YYYY 年 MM 月 DD 日 HH:mm") }}</span>
            </div>
          </div>
        </div>

        <!-- 标签 -->
        <div class="flex gap-2">
          <span
            v-for="tag in chatter.tags"
            :key="tag"
            class="px-3 py-1 text-xs rounded-full glass text-text-secondary"
          >
            #{{ tag }}
          </span>
        </div>
      </header>

      <!-- 多图画廊 -->
      <div v-if="chatter.images.length > 0" class="mb-8">
        <div class="grid gap-3" :class="chatter.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3'">
          <div
            v-for="(img, i) in chatter.images"
            :key="i"
            class="relative rounded-xl overflow-hidden bg-white/5 cursor-pointer group"
            :class="chatter.images.length === 1 ? 'aspect-video' : 'aspect-square'"
            @click="openLightbox(i)"
          >
            <img
              :src="img"
              :alt="`图片 ${i + 1}`"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <span class="text-white opacity-0 group-hover:opacity-100 transition-opacity text-2xl">🔍</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 正文内容 -->
      <div class="glass rounded-xl p-6 md:p-8">
        <div class="text-text-secondary leading-relaxed text-[15px] whitespace-pre-wrap">
          {{ chatter.content }}
        </div>
      </div>

      <!-- 底部返回 -->
      <div class="mt-8 text-center">
        <router-link
          to="/chatter"
          class="inline-flex items-center gap-2 glass rounded-xl px-6 py-3 text-sm text-text-secondary hover:text-white transition-all"
        >
          ← 返回杂谈列表
        </router-link>
      </div>
    </article>

    <!-- 不存在 -->
    <div v-else class="text-center py-20">
      <p class="text-5xl mb-4">💬</p>
      <p class="text-text-secondary">杂谈不存在</p>
    </div>

    <!-- ========== 灯箱 ========== -->
    <Teleport to="body">
      <Transition name="lightbox">
        <div
          v-if="lightboxOpen && chatter"
          class="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          @click.self="closeLightbox"
        >
          <!-- 关闭 -->
          <button
            class="absolute top-4 right-4 text-white/60 hover:text-white text-3xl z-10 p-2"
            @click="closeLightbox"
          >
            ✕
          </button>

          <!-- 计数 -->
          <div class="absolute top-4 left-4 text-white/60 text-sm z-10">
            {{ lightboxIndex + 1 }} / {{ chatter.images.length }}
          </div>

          <!-- 上一张 -->
          <button
            v-if="lightboxIndex > 0"
            class="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl z-10 p-2 transition-colors"
            @click.stop="prevImage"
          >
            ‹
          </button>

          <!-- 图片 -->
          <img
            :src="chatter.images[lightboxIndex]"
            :alt="`图片 ${lightboxIndex + 1}`"
            class="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
          />

          <!-- 下一张 -->
          <button
            v-if="lightboxIndex < chatter.images.length - 1"
            class="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-4xl z-10 p-2 transition-colors"
            @click.stop="nextImage"
          >
            ›
          </button>
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
