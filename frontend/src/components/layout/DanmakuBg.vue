<script setup lang="ts">
// 弹幕背景 — 半透明文字从右到左横向滚动
const danmakuLines = [
  { text: "Tailwind CSS 拯救前端", speed: 35, top: 8, size: 14, opacity: 0.5 },
  { text: "睡大觉中 💤", speed: 28, top: 16, size: 16, opacity: 0.5 },
  { text: "Vue 3 真香", speed: 40, top: 24, size: 13, opacity: 0.5 },
  { text: "NestJS 后端启动！", speed: 32, top: 32, size: 15, opacity: 0.5 },
  { text: "TypeScript 大法好", speed: 38, top: 40, size: 14, opacity: 0.5 },
  { text: "PostgreSQL 稳如老狗", speed: 45, top: 48, size: 13, opacity: 0.5 },
  { text: "Docker 一键部署", speed: 30, top: 56, size: 15, opacity: 0.5 },
  { text: "毛玻璃真是太帅了", speed: 36, top: 64, size: 14, opacity: 0.5 },
  { text: "🌸 樱花飞舞 🌸", speed: 42, top: 72, size: 13, opacity: 0.5 },
  { text: "🎵 音乐治愈一切 🎵", speed: 33, top: 80, size: 16, opacity: 0.5 },
  { text: "半夜写代码灵感最多", speed: 50, top: 88, size: 12, opacity:0.5 },
  { text: "BUG 退散！", speed: 27, top: 92, size: 14, opacity: 0.5},
];
</script>

<template>
  <div class="danmaku-container fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none">
    <div
      v-for="(line, i) in danmakuLines"
      :key="i"
      class="danmaku-line absolute whitespace-nowrap text-white"
      :style="{
        top: `${line.top}%`,
        fontSize: `${line.size}px`,
        opacity: line.opacity,
        animationDuration: `${line.speed}s`,
        animationDelay: `${-i * 3}s`,
      }"
    >
      {{ line.text }}
    </div>
  </div>
</template>

<style>
/* 弹幕动画 — 全局样式，避免 Vue scoped 哈希化 keyframes 名导致动画失效 */
.danmaku-line {
  animation: danmaku-scroll linear infinite;
}
@keyframes danmaku-scroll {
  0%   { transform: translateX(100vw); }
  100% { transform: translateX(-100%); }
}
</style>
