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
  let loadId = 0; // 请求序列号，防止竞态覆盖

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
        await loadTrack(0, false); // 不自动播放——浏览器会拦截非用户手势的 play()
      }
    } catch {
      playlist.value = [{
        id: 0, name: "暂无歌曲", artist: "请检查音乐服务", album: "", cover: "",
      }];
      playlistLoaded.value = true;
    } finally {
      playlistLoading.value = false;
    }
  }

  async function loadTrack(index: number, autoPlay = true) {
    if (index < 0 || index >= playlist.value.length) return;
    const myId = ++loadId; // 记录本次请求序列号
    currentIndex.value = index;
    loading.value = true;
    hasUrl.value = true;
    try {
      const track = playlist.value[index];
      const { data } = await client.get(`/music/url?id=${track.id}`);
      // 竞态保护：如果新请求已发起，丢弃本次结果
      if (myId !== loadId) return;
      if (data.url) {
        audio.src = `/api/proxy/audio?url=${encodeURIComponent(data.url)}`;
        audio.load();
        if (autoPlay) play();
      } else {
        hasUrl.value = false;
        if (autoPlay) setTimeout(() => next(), 50);
      }
    } catch {
      hasUrl.value = false;
    } finally {
      if (myId === loadId) loading.value = false;
    }
  }

  function play() {
    audio.play().catch(() => {});
    isPlaying.value = true;
  }

  // 解锁音频——在用户手势同步调用链中执行，后续异步 play() 才能通过浏览器策略
  function unlock() {
    const p = audio.play();
    if (p !== undefined) {
      p.then(() => { audio.pause(); }).catch(() => {});
    }
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
    unlock();
    const idx = currentIndex.value <= 0 ? playlist.value.length - 1 : currentIndex.value - 1;
    loadTrack(idx);
  }

  function next() {
    if (playlist.value.length === 0) return;
    unlock();
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
    loadPlaylist, loadTrack, unlock, toggle, prev, next, seek, formatTime,
  };
}
