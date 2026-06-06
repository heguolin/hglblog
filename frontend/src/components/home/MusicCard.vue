<script setup lang="ts">
import { mockMusic } from "@/mock/home";
import { ref } from "vue";

const { title, artist, album } = mockMusic;
const isPlaying = ref(mockMusic.isPlaying);
const progress = ref(mockMusic.progress);

function togglePlay() {
  isPlaying.value = !isPlaying.value;
}
</script>

<template>
  <!-- glass-strong: 视觉重心卡 -->
  <div class="music-card glass-strong card-hover p-5 md:p-6 flex flex-col gap-5 h-full">
    <!-- 顶部标签 -->
    <div class="flex items-center gap-2">
      <span class="relative flex h-2 w-2">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75" />
        <span class="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan" />
      </span>
      <span class="text-accent-cyan text-[11px] font-semibold tracking-[0.15em] uppercase">Now Playing</span>
    </div>

    <!-- 封面 + 歌曲信息 -->
    <div class="flex items-center gap-5 flex-1">
      <!-- 封面 -->
      <div class="relative w-[100px] h-[100px] rounded-2xl shrink-0 overflow-hidden bg-gradient-to-br from-accent-purple via-accent-pink to-accent-blue flex items-center justify-center shadow-lg shadow-accent-purple/10">
        <div class="text-[42px]">🎵</div>
        <div
          v-if="isPlaying"
          class="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center"
        >
          <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg">
            🎧
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-1.5 min-w-0 flex-1">
        <h3 class="text-white text-lg font-bold truncate tracking-tight">{{ title }}</h3>
        <p class="text-text-secondary text-[13px] truncate">{{ artist }}</p>
        <p class="text-text-muted text-[12px] truncate">{{ album }}</p>
        <!-- 内联进度条 -->
        <div class="mt-2 space-y-1.5">
          <div class="h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700"
              :style="{ width: `${progress}%`, background: 'linear-gradient(90deg, #ff6b9d, #c084fc, #60a5fa)' }"
            />
          </div>
          <div class="flex justify-between text-[11px] text-text-muted">
            <span>1:42</span>
            <span>3:58</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="flex items-center justify-center gap-5">
      <button class="text-text-muted hover:text-white transition-colors text-lg" title="上一首">⏮</button>
      <button
        class="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-white text-xl shadow-lg shadow-black/20"
        @click="togglePlay"
        :title="isPlaying ? '暂停' : '播放'"
      >
        {{ isPlaying ? "⏸" : "▶️" }}
      </button>
      <button class="text-text-muted hover:text-white transition-colors text-lg" title="下一首">⏭</button>
    </div>
  </div>
</template>
