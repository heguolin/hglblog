import { ref, onUnmounted } from "vue";
import client from "@/api/client";

export interface Track {
  id: number;
  name: string;
  artist: string;
  album: string;
  cover: string;
}

export function useAudioPlayer() {
  const audio = new Audio();
  const playlist = ref<Track[]>([]);
  const currentIndex = ref(-1);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const loading = ref(false);
  const hasUrl = ref(true);
  const playlistLoaded = ref(false);
  const playlistLoading = ref(false);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  async function loadPlaylist() {
    if (playlistLoaded.value || playlistLoading.value) return;
    playlistLoading.value = true;
    try {
      const { data } = await client.get("/music/playlist");
      playlist.value = data;
      playlistLoaded.value = true;
      if (data.length > 0) {
        currentIndex.value = 0;
        await loadTrack(0);
      }
    } catch {
      // 兜底：mock 数据
      playlist.value = [{
        id: 0, name: "暂无歌曲", artist: "请检查音乐服务", album: "", cover: "",
      }];
      playlistLoaded.value = true;
    } finally {
      playlistLoading.value = false;
    }
  }

  async function loadTrack(index: number) {
    if (index < 0 || index >= playlist.value.length) return;
    currentIndex.value = index;
    loading.value = true;
    hasUrl.value = true;
    try {
      const track = playlist.value[index];
      const { data } = await client.get(`/music/url?id=${track.id}`);
      if (data.url) {
        // 通过后端代理避免 Mixed Content
        audio.src = `/api/proxy/audio?url=${encodeURIComponent(data.url)}`;
        audio.load();
        play();
      } else {
        hasUrl.value = false;
        // 自动跳过无版权曲
        setTimeout(() => next(), 50);
      }
    } catch {
      hasUrl.value = false;
    } finally {
      loading.value = false;
    }
  }

  function play() {
    audio.play().catch(() => {
      // 浏览器自动播放策略限制
    });
    isPlaying.value = true;
  }

  function pause() {
    audio.pause();
    isPlaying.value = false;
  }

  function toggle() {
    isPlaying.value ? pause() : play();
  }

  function prev() {
    if (playlist.value.length === 0) return;
    const idx = currentIndex.value <= 0 ? playlist.value.length - 1 : currentIndex.value - 1;
    loadTrack(idx);
  }

  function next() {
    if (playlist.value.length === 0) return;
    const idx = (currentIndex.value + 1) % playlist.value.length;
    loadTrack(idx);
  }

  function seek(time: number) {
    audio.currentTime = time;
    currentTime.value = time;
  }

  audio.addEventListener("timeupdate", () => {
    currentTime.value = audio.currentTime;
  });
  audio.addEventListener("loadedmetadata", () => {
    duration.value = audio.duration;
  });
  audio.addEventListener("play", () => { isPlaying.value = true; });
  audio.addEventListener("pause", () => { isPlaying.value = false; });
  audio.addEventListener("ended", () => next());

  onUnmounted(() => {
    audio.pause();
    audio.src = "";
  });

  return {
    playlist, currentIndex, isPlaying, currentTime, duration,
    loading, hasUrl, playlistLoaded,
    loadPlaylist, loadTrack, toggle, prev, next, seek, formatTime,
  };
}
