<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useAudioPlayer } from "@/composables/useAudioPlayer";

const player = useAudioPlayer();
const progressBar = ref<HTMLDivElement>();
const cardRef = ref<HTMLDivElement>();

// 歌单选歌
const searchQuery = ref("");
const dropdownOpen = ref(false);
const highlightIndex = ref(0);

interface PlaylistItem {
  song: { id: number; name: string; artist: string; album: string; cover: string };
  originalIndex: number;
}

const filteredPlaylist = computed<PlaylistItem[]>(() => {
  const q = searchQuery.value.toLowerCase().trim();
  return player.playlist.value
    .map((song, i) => ({ song, originalIndex: i }))
    .filter(({ song }) => {
      if (!q) return true;
      return song.name.toLowerCase().includes(q) || song.artist.toLowerCase().includes(q);
    });
});

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value;
  if (dropdownOpen.value) {
    highlightIndex.value = 0;
    searchQuery.value = "";
  }
}

function closeDropdown() {
  dropdownOpen.value = false;
  searchQuery.value = "";
}

function selectTrack(originalIndex: number) {
  player.loadTrack(originalIndex);
  closeDropdown();
}

function onDropdownKeydown(e: KeyboardEvent) {
  if (!dropdownOpen.value) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    highlightIndex.value = Math.min(highlightIndex.value + 1, filteredPlaylist.value.length - 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    highlightIndex.value = Math.max(highlightIndex.value - 1, 0);
  } else if (e.key === "Enter") {
    e.preventDefault();
    const item = filteredPlaylist.value[highlightIndex.value];
    if (item) selectTrack(item.originalIndex);
  } else if (e.key === "Escape") {
    closeDropdown();
  }
}

// 点击外部关闭
function onClickOutside(e: MouseEvent) {
  if (cardRef.value && !cardRef.value.contains(e.target as Node)) {
    closeDropdown();
  }
}

onMounted(() => {
  player.loadPlaylist();
  document.addEventListener("click", onClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", onClickOutside);
});

function onProgressClick(e: MouseEvent) {
  if (!progressBar.value || !player.duration.value) return;
  const rect = progressBar.value.getBoundingClientRect();
  const ratio = (e.clientX - rect.left) / rect.width;
  player.seek(ratio * player.duration.value);
}

const currentTrack = computed(() => {
  const idx = player.currentIndex.value;
  return idx >= 0 ? player.playlist.value[idx] : null;
});

const progressPercent = computed(() =>
  player.duration.value > 0 ? (player.currentTime.value / player.duration.value) * 100 : 0,
);
</script>

<template>
  <div ref="cardRef" class="music-card glass-strong card-hover p-5 md:p-6 flex flex-col gap-4 h-full">
    <!-- 顶部标签 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75" />
          <span class="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan" />
        </span>
        <span class="text-accent-cyan text-[11px] font-semibold tracking-[0.15em] uppercase">Now Playing</span>
      </div>
      <div class="flex items-center gap-2">
        <span v-if="player.playlist.value.length > 1" class="text-text-muted text-[11px]">
          {{ player.currentIndex.value + 1 }}/{{ player.playlist.value.length }}
        </span>
        <!-- 歌单按钮 -->
        <button
          class="glass rounded-lg px-3 py-1.5 text-xs text-text-secondary hover:text-white transition-colors flex items-center gap-1"
          @click.stop="toggleDropdown"
        >
          <span>🎵 歌单</span>
          <span class="text-text-muted text-[10px]" :class="dropdownOpen && 'rotate-180'" style="transition: transform 0.2s">▼</span>
        </button>
      </div>
    </div>

    <!-- 加载中 / 无音源 / 有空状态 -->
    <div v-if="!player.playlistLoaded.value" class="flex-1 flex items-center justify-center text-text-muted text-sm">
      加载歌单中...
    </div>
    <div v-else-if="currentTrack" class="flex items-center gap-5 flex-1">
      <!-- 封面 -->
      <div class="relative w-[100px] h-[100px] rounded-2xl shrink-0 overflow-hidden bg-gradient-to-br from-accent-purple via-accent-pink to-accent-blue flex items-center justify-center shadow-lg">
        <img v-if="currentTrack.cover" :src="currentTrack.cover.includes('music.126.net') ? `/api/proxy/image?url=${encodeURIComponent(currentTrack.cover)}` : currentTrack.cover" class="absolute inset-0 w-full h-full object-cover" />
        <div class="text-[42px]" :class="{ 'opacity-0': currentTrack.cover }">🎵</div>
        <div v-if="!player.hasUrl.value" class="absolute inset-0 bg-black/60 flex items-center justify-center text-white/60 text-xs">
          暂无音源
        </div>
      </div>

      <div class="flex flex-col gap-1.5 min-w-0 flex-1">
        <h3 class="text-white text-lg font-bold truncate tracking-tight">{{ currentTrack.name }}</h3>
        <p class="text-text-secondary text-[13px] truncate">{{ currentTrack.artist }}</p>
        <p class="text-text-muted text-[12px] truncate">{{ currentTrack.album }}</p>

        <!-- 进度条 -->
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

    <div v-else class="flex-1 flex items-center justify-center text-text-muted text-sm">暂无歌曲</div>

    <!-- ====== 歌单搜索下拉 ====== -->
    <div v-if="dropdownOpen" class="relative">
      <!-- 搜索框 -->
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索歌名或歌手..."
        class="w-full glass rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-text-muted outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors"
        @keydown="onDropdownKeydown"
        @click.stop
      />
      <!-- 歌曲列表 -->
      <div
        class="absolute bottom-full mb-2 left-0 right-0 glass rounded-xl border border-white/10 max-h-60 overflow-y-auto z-10 shadow-xl shadow-black/30"
      >
        <div
          v-if="filteredPlaylist.length === 0"
          class="px-4 py-6 text-center text-text-muted text-sm"
        >
          无匹配歌曲
        </div>
        <button
          v-for="(item, i) in filteredPlaylist"
          :key="item.song.id"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/[0.06] transition-colors"
          :class="[
            i === highlightIndex ? 'bg-white/[0.06]' : '',
            item.originalIndex === player.currentIndex.value ? 'text-accent-cyan' : 'text-white',
          ]"
          @click.stop="selectTrack(item.originalIndex)"
        >
          <img
            v-if="item.song.cover"
            :src="item.song.cover.includes('music.126.net') ? `/api/proxy/image?url=${encodeURIComponent(item.song.cover)}` : item.song.cover"
            class="w-10 h-10 rounded-lg object-cover shrink-0 bg-white/5"
          />
          <div v-else class="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-lg">🎵</div>
          <div class="min-w-0">
            <p
              class="text-sm font-medium truncate"
              :class="item.originalIndex === player.currentIndex.value ? 'text-accent-cyan' : 'text-white'"
            >{{ item.song.name }}</p>
            <p class="text-xs text-text-muted truncate">{{ item.song.artist }}</p>
          </div>
        </button>
      </div>
    </div>

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
