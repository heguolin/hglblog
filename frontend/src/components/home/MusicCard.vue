<script setup lang="ts">
import { ref, computed } from "vue";
import { useAudioPlayer } from "@/composables/useAudioPlayer";

const player = useAudioPlayer();
const progressBar = ref<HTMLDivElement>();

function init() {
  player.loadPlaylist();
}

function onProgressClick(e: MouseEvent) {
  if (!progressBar.value || !player.duration.value) return;
  const rect = progressBar.value.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  player.seek(ratio * player.duration.value);
}

// 当前曲目
const currentTrack = computed(() => {
  const idx = player.currentIndex.value;
  return idx >= 0 ? player.playlist.value[idx] : null;
});

const progressPercent = computed(() =>
  player.duration.value > 0 ? (player.currentTime.value / player.duration.value) * 100 : 0,
);
</script>

<template>
  <!-- glass-strong: 视觉重心 -->
  <div class="music-card glass-strong card-hover p-5 md:p-6 flex flex-col gap-5 h-full" @vue:mounted="init">
    <!-- 顶部标签 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75" />
          <span class="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan" />
        </span>
        <span class="text-accent-cyan text-[11px] font-semibold tracking-[0.15em] uppercase">Now Playing</span>
      </div>
      <span v-if="player.playlist.value.length > 1" class="text-text-muted text-[11px]">
        {{ player.currentIndex.value + 1 }}/{{ player.playlist.value.length }}
      </span>
    </div>

    <!-- 加载歌单中 / 无音源降级 -->
    <div v-if="!player.playlistLoaded.value" class="flex-1 flex items-center justify-center text-text-muted text-sm">
      加载歌单中...
    </div>
    <div v-else-if="currentTrack" class="flex items-center gap-5 flex-1">
      <!-- 封面 -->
      <div class="relative w-[100px] h-[100px] rounded-2xl shrink-0 overflow-hidden bg-gradient-to-br from-accent-purple via-accent-pink to-accent-blue flex items-center justify-center shadow-lg">
        <img v-if="currentTrack.cover" :src="currentTrack.cover" class="absolute inset-0 w-full h-full object-cover" />
        <div class="text-[42px]" :class="{ 'opacity-0': currentTrack.cover }">🎵</div>
        <!-- 无音源降级 -->
        <div v-if="!player.hasUrl.value" class="absolute inset-0 bg-black/60 flex items-center justify-center text-white/60 text-xs">
          暂无音源
        </div>
      </div>

      <div class="flex flex-col gap-1.5 min-w-0 flex-1">
        <h3 class="text-white text-lg font-bold truncate tracking-tight">{{ currentTrack.name }}</h3>
        <p class="text-text-secondary text-[13px] truncate">{{ currentTrack.artist }}</p>
        <p class="text-text-muted text-[12px] truncate">{{ currentTrack.album }}</p>

        <!-- 进度条（可点击） -->
        <div class="mt-2 space-y-1.5">
          <div ref="progressBar" class="h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer group" @click="onProgressClick">
            <div
              class="h-full rounded-full transition-all duration-200 group-hover:h-2"
              :style="{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #ff6b9d, #c084fc, #60a5fa)' }"
            />
          </div>
          <div class="flex justify-between text-[11px] text-text-muted">
            <span>{{ player.formatTime(player.currentTime.value) }}</span>
            <span>{{ player.formatTime(player.duration.value) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空 -->
    <div v-else class="flex-1 flex items-center justify-center text-text-muted text-sm">暂无歌曲</div>

    <!-- 控制按钮 -->
    <div class="flex items-center justify-center gap-5">
      <button class="text-text-muted hover:text-white transition-colors text-lg" :disabled="!player.playlistLoaded.value" @click="player.prev()">⏮</button>
      <button
        class="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 transition-all flex items-center justify-center text-white text-xl shadow-lg disabled:opacity-40"
        :disabled="!player.playlistLoaded.value || !player.hasUrl.value"
        @click="player.toggle()"
      >
        {{ player.loading.value ? "⏳" : player.isPlaying.value ? "⏸" : "▶️" }}
      </button>
      <button class="text-text-muted hover:text-white transition-colors text-lg" :disabled="!player.playlistLoaded.value" @click="player.next()">⏭</button>
    </div>
  </div>
</template>
