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
const displaySrc = computed(() => {
  if (!props.thumbWidth) return props.src;
  // 只对 img.hgl123.icu 的图片生成缩略图，跳过 data: / blob:
  if (!props.src.includes("img.hgl123.icu")) return props.src;
  return props.src
    .replace("/i/", "/thumb/")
    .replace("/uploads/", "/thumb/")
    + `?w=${props.thumbWidth}`;
});

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

function onError() {
  error.value = true;
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
      @error="onError"
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
