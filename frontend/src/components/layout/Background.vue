<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

// ====== 遮罩透明度常量（方便微调） ======
const OVERLAY_OPACITY = 0.5;
const OVERLAY_COLOR = `rgba(15, 12, 41, ${OVERLAY_OPACITY})`;

// ====== 浮动光球（降级方案使用） ======
const orbs = [
  { id: 1, color: "rgba(255, 107, 157, 0.3)", size: 400, x: "15%", y: "20%", duration: 20, delay: 0 },
  { id: 2, color: "rgba(192, 132, 252, 0.25)", size: 350, x: "75%", y: "60%", duration: 25, delay: 2 },
  { id: 3, color: "rgba(96, 165, 250, 0.2)", size: 300, x: "50%", y: "80%", duration: 22, delay: 5 },
  { id: 4, color: "rgba(34, 211, 238, 0.2)", size: 380, x: "85%", y: "15%", duration: 28, delay: 8 },
];

// ====== 动态背景 ======
const images = ref<string[]>([]);
const currentIndex = ref(0);
const prevIndex = ref(-1);
const isTransitioning = ref(false);
const useFallback = ref(false);
const SWITCH_INTERVAL = 8000; // 8 秒切换
const TRANSITION_DURATION = 1200; // 1.2s 过渡
let timer: ReturnType<typeof setInterval> | null = null;

// 预加载图片
function preloadImage(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // 加载失败也继续
    img.src = url;
  });
}

async function loadImages() {
  try {
    const res = await fetch("/api/site/background-images");
    const data = await res.json();
    if (data.images && data.images.length > 0) {
      // 随机打乱
      images.value = data.images.sort(() => Math.random() - 0.5);
      // 预加载第一张
      await preloadImage(images.value[0]);
      useFallback.value = false;
      startCarousel();
      return;
    }
  } catch { /* fallback */ }
  useFallback.value = true;
}

function startCarousel() {
  if (images.value.length <= 1) return;
  timer = setInterval(async () => {
    prevIndex.value = currentIndex.value;
    currentIndex.value = (currentIndex.value + 1) % images.value.length;
    isTransitioning.value = true;
    // 预加载下一张
    const nextIdx = (currentIndex.value + 1) % images.value.length;
    preloadImage(images.value[nextIdx]);
    setTimeout(() => {
      isTransitioning.value = false;
    }, TRANSITION_DURATION);
  }, SWITCH_INTERVAL);
}

onMounted(() => {
  loadImages();
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="fixed inset-0 -z-10 overflow-hidden">
    <!-- ====== 动态图床背景 ====== -->
    <template v-if="!useFallback && images.length > 0">
      <!-- 当前图 -->
      <img
        :src="images[currentIndex]"
        class="absolute inset-0 w-full h-full object-cover"
        :class="{ 'opacity-100': !isTransitioning, 'opacity-0': isTransitioning }"
        style="transition: opacity 1.2s ease-in-out"
      />
      <!-- 预加载不可见层 -->
      <img
        v-if="images.length > 1"
        :src="images[(currentIndex + 1) % images.length]"
        class="hidden"
      />
      <!-- 暗色遮罩 -->
      <div class="absolute inset-0" :style="{ backgroundColor: OVERLAY_COLOR }" />
    </template>

    <!-- ====== 降级：深色渐变 + 浮动光球 ====== -->
    <template v-else>
      <div class="absolute inset-0 bg-gradient-to-br from-[#0f0c29] via-[#302b63] via-[#24243e] to-[#1a1a2e]" />
      <div
        v-for="orb in orbs"
        :key="orb.id"
        class="absolute rounded-full"
        :style="{
          width: `${orb.size}px`,
          height: `${orb.size}px`,
          background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
          left: orb.x,
          top: orb.y,
          filter: 'blur(80px)',
          animation: `float-orb ${orb.duration}s ease-in-out ${orb.delay}s infinite`,
          transform: 'translate(-50%, -50%)',
        }"
      />
    </template>
  </div>
</template>

<style scoped>
@keyframes float-orb {
  0%, 100% { transform: translate(-50%, -50%) translateY(0); }
  25%      { transform: translate(-50%, -50%) translateY(-30px) translateX(15px); }
  50%      { transform: translate(-50%, -50%) translateY(10px) translateX(-10px); }
  75%      { transform: translate(-50%, -50%) translateY(-20px) translateX(-15px); }
}
</style>
