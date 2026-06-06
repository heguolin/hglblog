<script setup lang="ts">
import { mockTheme, mockSystem } from "@/mock/home";
import { ref, onMounted, onUnmounted } from "vue";
import dayjs from "dayjs";

const { isNight, greeting } = mockTheme;

const currentTime = ref(dayjs().format("HH:mm"));
const daysRunning = ref(0);
let timeInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  timeInterval = setInterval(() => {
    currentTime.value = dayjs().format("HH:mm");
  }, 30000); // 每 30 秒更新，够用且省资源
  daysRunning.value = Math.floor(
    (Date.now() - new Date(mockSystem.startDate).getTime()) / (1000 * 60 * 60 * 24),
  );
});

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval);
});
</script>

<template>
  <!-- 精简小卡片，居中对齐 -->
  <div class="theme-card glass card-hover p-5 md:p-6 flex flex-col items-center justify-center gap-4 h-full">
    <!-- 月亮 -->
    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-purple/15 to-accent-blue/15 border border-white/5 flex items-center justify-center text-2xl">
      {{ isNight ? "🌙" : "☀️" }}
    </div>

    <!-- 问候 + 时钟 -->
    <div class="text-center">
      <p class="text-text-muted text-[11px] tracking-wider">{{ greeting }}</p>
      <p class="text-white text-[26px] font-bold font-mono tracking-tight tabular-nums leading-tight">{{ currentTime }}</p>
    </div>

    <!-- 运行天数 -->
    <div class="text-center">
      <p class="text-accent-cyan text-xl font-bold">{{ daysRunning }}<span class="text-xs font-normal text-text-muted ml-0.5">天</span></p>
      <p class="text-text-muted text-[11px] mt-0.5">已稳定运行</p>
    </div>
  </div>
</template>
