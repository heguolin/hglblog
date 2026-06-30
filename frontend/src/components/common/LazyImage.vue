<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

const props = withDefaults(defineProps<{
  src: string;
  alt?: string;
  aspectRatio?: string;
  blurUp?: boolean;
  thumbWidth?: number;   // 缩略图宽度，如 400；传入后自动用 img.hgl123.icu/thumb/ 加载
  objectFit?: string;
  class?: string;
}>(), {
  alt: "",
  blurUp: true,
  objectFit: "cover",
});

const loaded = ref(false);
const error = ref(false);
const inView = ref(false);
const imgRef = ref<HTMLDivElement>();
const imgEl = ref<HTMLImageElement>();
let observer: IntersectionObserver | null = null;

// ====== 缩略图 URL 自动生成 ======
// 优先用图床上传时预生成的 _thumb.webp（零 CPU），
// 不存在时回退到 Nginx image_filter 实时 resize
function thumbUrl(fallback = false): string {
  if (!props.thumbWidth) return fallback ? "" : props.src;
  if (!props.src.includes("img.hgl123.icu")) return props.src;

  // 去掉扩展名，拼 _thumb.webp
  const base = props.src.replace(/\.[^.]+$/, "");
  if (!fallback) return `${base}_thumb.webp`;

  // 回退：Nginx /thumb/ 端点
  return props.src
    .replace("/i/", "/thumb/")
    .replace("/uploads/", "/thumb/")
    + `?w=${props.thumbWidth}`;
}

const displaySrc = ref(thumbUrl());

// error 处理：先回退到 /thumb/，两次都失败才显示错误
function onImgError() {
  const fallback = thumbUrl(true);
  if (fallback && displaySrc.value !== fallback) {
    displaySrc.value = fallback;
    return;
  }
  error.value = true;
  loaded.value = true;
}

// 动态过渡样式
const imgStyle = computed(() => {
  if (!props.blurUp) return {};
  if (!loaded.value) {
    return {
      filter: "blur(20px) scale(1.1)",
      willChange: "filter, transform",
    };
  }
  return {
    filter: "blur(0) scale(1)",
    transition: "filter 0.5s ease",
  };
});

onMounted(() => {
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        inView.value = true;
        observer?.disconnect();
      }
    },
    { rootMargin: "200px" },
  );
  if (imgRef.value) observer.observe(imgRef.value);
});

onUnmounted(() => {
  observer?.disconnect();
});

function onLoad() {
  loaded.value = true;
}

function onTransitionEnd() {
  if (imgEl.value) {
    imgEl.value.style.willChange = "auto";
  }
}
</script>

<template>
  <div
    ref="imgRef"
    class="relative overflow-hidden"
    :class="[props.class || 'rounded-xl', !blurUp ? 'bg-white/5' : '']"
    :style="aspectRatio ? { aspectRatio } : {}"
  >
    <!-- 骨架 shimmer -->
    <div
      v-if="!loaded && (!blurUp || !inView)"
      class="absolute inset-0 animate-pulse bg-white/[0.03]"
    />

    <!-- 图片 -->
    <img
      v-if="inView"
      ref="imgEl"
      :src="displaySrc"
      :alt="alt"
      :class="[
        props.class || 'rounded-xl',
        'w-full h-full',
        `object-${objectFit}`,
        blurUp ? 'blur-up-img' : `transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`,
      ]"
      :style="imgStyle"
      @load="onLoad"
      @error="onImgError"
      @transitionend="onTransitionEnd"
    />

    <!-- 错误回退 -->
    <div
      v-if="error"
      class="absolute inset-0 flex items-center justify-center bg-white/[0.03]"
    >
      <span class="text-text-muted text-sm px-4 text-center">{{ alt || "图片加载失败" }}</span>
    </div>
  </div>
</template>
