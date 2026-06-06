<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();
const avatarUrl = ref<string | null>(null);

// ========== 打字机文字 ==========
const typewriterPhrases = [
  "INITIALIZING SYSTEM...",
  "LOADING MODULES...",
  "CONNECTING TO SERVER...",
  "RENDERING UI...",
  "SYSTEM READY.",
];
const typedText = ref("");
let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typeInterval: ReturnType<typeof setInterval> | null = null;

function startTypewriter() {
  typeInterval = setInterval(() => {
    const currentPhrase = typewriterPhrases[phraseIndex];
    if (!isDeleting) {
      typedText.value = currentPhrase.slice(0, charIndex + 1);
      charIndex++;
      if (charIndex >= currentPhrase.length) {
        isDeleting = true;
      }
    } else {
      typedText.value = currentPhrase.slice(0, charIndex - 1);
      charIndex--;
      if (charIndex <= 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % typewriterPhrases.length;
      }
    }
  }, 80 + Math.random() * 40);
}

// ========== 移动端菜单 ==========
const isMenuOpen = ref(false);

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value;
}

function closeMenu() {
  isMenuOpen.value = false;
}

// ========== 导航链接 ==========
const navLinks = [
  { to: "/", label: "🏠 首页", exact: true },
  { to: "/chatter", label: "💬 杂谈" },
  { to: "/photowall", label: "📷 光影" },
  { to: "/archive", label: "📦 归档" },
  { to: "/about", label: "🌸 关于" },
  { to: "/friends", label: "🔗 友链" },
];

function isActive(to: string, exact?: boolean): boolean {
  if (exact) return route.path === to;
  return route.path.startsWith(to);
}

onMounted(async () => {
  startTypewriter();
  // 加载头像 — 直接 fetch 走 Vite 代理，避免 Axios 初始化时序问题
  try {
    const res = await fetch("/api/site/config/avatar");
    const data = await res.json();
    avatarUrl.value = JSON.parse(data.value);
  } catch (e) {
    console.warn("头像加载失败:", e);
  }
});

onUnmounted(() => {
  if (typeInterval) clearInterval(typeInterval);
});
</script>

<template>
  <div>
  <!-- ========== 桌面端：Grid 列内 sticky 侧边栏 ========== -->
  <aside class="hidden lg:flex items-center justify-center sticky top-0 h-screen">
    <div class="glass rounded-2xl p-5 w-52 flex flex-col items-center gap-4 backdrop-blur-xl">
      <!-- 头像 -->
      <div class="relative w-20 h-20 rounded-full bg-gradient-to-br from-accent-pink via-accent-purple to-accent-blue p-[2px]">
        <div class="w-full h-full rounded-full bg-[#1a1a2e] flex items-center justify-center text-2xl font-bold text-white overflow-hidden">
          <img v-if="avatarUrl" :src="avatarUrl" class="w-full h-full object-cover rounded-full" />
          <span v-else>H</span>
        </div>
      </div>

      <!-- 昵称 -->
      <div class="text-white font-bold text-lg">HGL</div>

      <!-- 打字机 -->
      <div class="text-accent-cyan text-xs font-mono h-5 flex items-center">
        <span>{{ typedText }}</span>
        <span class="inline-block w-[2px] h-4 bg-accent-cyan ml-[2px]" />
      </div>

      <!-- 分割线 -->
      <div class="w-full h-px bg-white/10" />

      <!-- 导航 -->
      <nav class="w-full flex flex-col gap-1">
        <router-link
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="block px-3 py-2 rounded-lg text-sm transition-all duration-300"
          :class="isActive(link.to, link.exact)
            ? 'bg-white/10 text-white font-medium'
            : 'text-text-secondary hover:bg-white/5 hover:text-white'"
        >
          {{ link.label }}
        </router-link>
      </nav>
    </div>
  </aside>

  <!-- ========== 移动端：fixed 顶部导航条 ========== -->
  <div class="lg:hidden fixed top-0 left-0 right-0 z-50">
    <div class="glass-strong mx-3 mt-3 px-4 py-3 rounded-xl flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-accent-pink to-accent-blue flex items-center justify-center text-sm font-bold text-white overflow-hidden">
          <img v-if="avatarUrl" :src="avatarUrl" class="w-full h-full object-cover rounded-full" />
          <span v-else>H</span>
        </div>
        <span class="text-white font-bold text-sm">HGL</span>
      </div>
      <button
        class="text-white/70 hover:text-white transition-colors p-1"
        @click="toggleMenu"
      >
        <!-- 汉堡图标 -->
        <svg v-if="!isMenuOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- 下拉菜单 -->
    <Transition name="slide-down">
      <div v-if="isMenuOpen" class="mx-3 mt-2 glass rounded-xl overflow-hidden">
        <nav class="flex flex-col py-1">
          <router-link
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="px-4 py-3 text-sm transition-colors"
            :class="isActive(link.to, link.exact)
              ? 'bg-white/10 text-white font-medium'
              : 'text-text-secondary hover:bg-white/5 hover:text-white'"
            @click="closeMenu"
          >
            {{ link.label }}
          </router-link>
        </nav>
      </div>
    </Transition>
  </div>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
