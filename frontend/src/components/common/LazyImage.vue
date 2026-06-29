<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

const props = withDefaults(defineProps<{
  src: string;
  alt?: string;
  aspectRatio?: string;
  blurUp?: boolean;
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

// 动态过渡样式 — blur-up 模式下 loaded 后触发 blur→clear + fade-in
const imgStyle = computed(() => {
  if (!props.blurUp) return {};
  if (!loaded.value) {
    return {
      filter: "blur(20px) scale(1.1)",
      willChange: "filter, transform",
      opacity: "0",
    };
  }
  return {
    filter: "blur(0) scale(1)",
    opacity: "1",
    transition: "filter 0.5s ease, opacity 0.5s ease",
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
  loaded.value = true; // 解除 blur 状态
}

// transitionend 后清理 will-change，释放 GPU 内存
function onTransitionEnd() {
  if (imgEl.value) {
    imgEl.value.style.willChange = "auto";
  }
}
</script>

<template>
  <div
    ref="imgRef"
    class="relative overflow-hidden bg-white/5"
    :class="[props.class || 'rounded-xl']"
    :style="aspectRatio ? { aspectRatio } : {}"
  >
    <!-- 骨架 shimmer — 非 blur-up 模式或 blur-up 模式图片未进入视口时显示 -->
    <div
      v-if="!loaded && (!blurUp || !inView)"
      class="absolute inset-0 animate-pulse bg-white/[0.03]"
    />

    <!-- 图片 -->
    <img
      v-if="inView"
      ref="imgEl"
      :src="src"
      :alt="alt"
      :class="[
        props.class || 'rounded-xl',
        'w-full h-full',
        `object-${objectFit}`,
        blurUp ? 'blur-up-img' : 'transition-opacity duration-500',
        loaded ? 'opacity-100' : 'opacity-0',
      ]"
      :style="imgStyle"
      @load="onLoad"
      @error="onError"
      @transitionend="onTransitionEnd"
    />

    <!-- 错误回退 — 显示 alt 文本 -->
    <div
      v-if="error"
      class="absolute inset-0 flex items-center justify-center bg-white/[0.03]"
    >
      <span class="text-text-muted text-sm px-4 text-center">{{ alt || "图片加载失败" }}</span>
    </div>
  </div>
</template>
