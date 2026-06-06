<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const tips = [
  "这里什么都没有，就像周一下午的咖啡机 ☕",
  "你发现了一个不存在的页面！🎉",
  "404 — 可能是被猫咪踩键盘删掉了 🐱",
  "这张页面还在成长中，请耐心等待 🌱",
  "恭喜你找到了本站的隐藏地点！（并没有什么奖励）",
  "页面不存在，但你的探索精神值得赞扬 ⭐",
  "也许是时候泡杯茶，想想你原本要去哪里了 🍵",
];

const randomTip = tips[Math.floor(Math.random() * tips.length)];

function goHome() {
  router.push("/");
}
</script>

<template>
  <div class="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
    <!-- 404 大字 -->
    <div class="text-8xl md:text-9xl font-bold bg-gradient-to-r from-accent-pink via-accent-purple to-accent-cyan bg-clip-text text-transparent mb-6 select-none">
      404
    </div>

    <!-- 趣味提示 -->
    <p class="text-text-secondary text-lg mb-2">{{ randomTip }}</p>
    <p class="text-text-muted text-sm mb-8">你访问的页面不存在或已被移除</p>

    <!-- 按钮 -->
    <div class="flex gap-4">
      <button
        class="glass-strong rounded-xl px-6 py-3 text-sm text-white font-medium hover:bg-white/15 transition-all"
        @click="goHome"
      >
        🏠 返回首页
      </button>
      <button
        class="glass rounded-xl px-6 py-3 text-sm text-text-secondary hover:text-white transition-all"
        @click="router.back()"
      >
        ← 返回上页
      </button>
    </div>

    <!-- 装饰 -->
    <div class="mt-12 text-6xl select-none opacity-30">
      🌸✨💫
    </div>
  </div>
</template>
