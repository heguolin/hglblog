<script setup lang="ts">
import { mockSystem } from "@/mock/home";
import { ref, onMounted } from "vue";

const { techStack, startDate } = mockSystem;
const daysRunning = ref(0);
const currentYear = ref(new Date().getFullYear());

// 每个技术标签用强调色系
const accentColors = [
  "text-accent-cyan border-accent-cyan/20",
  "text-accent-purple border-accent-purple/20",
  "text-accent-pink border-accent-pink/20",
  "text-accent-blue border-accent-blue/20",
];
const styledTechs = techStack.map((name, i) => ({
  name,
  colorClass: accentColors[i % accentColors.length],
}));

onMounted(() => {
  daysRunning.value = Math.floor(
    (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
  );
});
</script>

<template>
  <div class="system-info-card glass card-hover p-5 md:p-6 flex flex-col gap-4 h-full">
    <!-- 标题 -->
    <div class="flex items-center justify-between">
      <h3 class="text-white text-sm font-bold flex items-center gap-2">
        <span>📊</span> 系统信息
      </h3>
      <span class="text-[11px] text-accent-cyan font-medium flex items-center gap-1.5">
        <span class="w-[6px] h-[6px] rounded-full bg-green-400 animate-pulse" />
        运行中
      </span>
    </div>

    <!-- 技术栈标签云 — 用强调色区分 -->
    <div class="flex flex-wrap gap-2">
      <span
        v-for="item in styledTechs"
        :key="item.name"
        class="px-3 py-1.5 text-[12px] rounded-full glass border transition-all duration-300 hover:scale-105 cursor-default"
        :class="item.colorClass"
      >
        {{ item.name }}
      </span>
    </div>

    <!-- 分割线 -->
    <div class="w-full h-px bg-white/5" />

    <!-- 底部 -->
    <div class="flex items-center justify-between text-[12px] text-text-muted mt-auto">
      <span>© {{ currentYear }} HGL Blog</span>
      <span>稳定运行 {{ daysRunning }} 天</span>
    </div>
  </div>
</template>
