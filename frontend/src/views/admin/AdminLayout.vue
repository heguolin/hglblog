<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const mobileMenuOpen = ref(false);

const menuItems = [
  { to: "/admin/dashboard", label: "📊 概览", icon: "📊" },
  { to: "/admin/posts", label: "📝 文章", icon: "📝" },
  { to: "/admin/chatters", label: "💬 杂谈", icon: "💬" },
  { to: "/admin/albums", label: "📷 相册", icon: "📷" },
  { to: "/admin/friends", label: "🔗 友链", icon: "🔗" },
  { to: "/admin/settings", label: "⚙️ 设置", icon: "⚙️" },
];

const userName = computed(() => authStore.user?.username ?? "Admin");

function isActive(path: string) {
  return route.path.startsWith(path);
}

function handleLogout() {
  authStore.logout();
  router.replace("/admin/login");
}

function closeMenu() {
  mobileMenuOpen.value = false;
}
</script>

<template>
  <div class="min-h-screen flex flex-col lg:flex-row">
    <!-- ====== 移动端顶部栏 ====== -->
    <div class="lg:hidden glass-strong mx-3 mt-3 px-4 py-3 rounded-xl flex items-center justify-between">
      <span class="text-white font-bold text-sm">HGL Admin</span>
      <button class="text-white/70 hover:text-white p-1" @click="mobileMenuOpen = !mobileMenuOpen">
        <svg v-if="!mobileMenuOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- 移动端下拉菜单 -->
    <Transition name="slide-down">
      <nav v-if="mobileMenuOpen" class="lg:hidden mx-3 mt-2 glass rounded-xl overflow-hidden">
        <router-link
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-4 py-3 text-sm transition-colors"
          :class="isActive(item.to) ? 'bg-white/10 text-white font-medium' : 'text-text-secondary hover:bg-white/5 hover:text-white'"
          @click="closeMenu"
        >
          {{ item.label }}
        </router-link>
        <div class="border-t border-white/5 px-4 py-3">
          <button class="text-text-muted text-sm hover:text-accent-pink transition-colors" @click="handleLogout">🚪 退出登录</button>
        </div>
      </nav>
    </Transition>

    <!-- ====== 桌面端左侧导航 ====== -->
    <aside class="hidden lg:flex lg:flex-col lg:w-56 lg:shrink-0 lg:min-h-screen glass border-r border-white/5">
      <!-- Logo -->
      <div class="px-5 py-5 border-b border-white/5">
        <router-link to="/admin/dashboard" class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-pink to-accent-blue flex items-center justify-center text-sm font-bold text-white">
            H
          </div>
          <span class="text-white font-bold text-sm">HGL Admin</span>
        </router-link>
      </div>

      <!-- 菜单 -->
      <nav class="flex-1 px-3 py-4 space-y-1">
        <router-link
          v-for="item in menuItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
          :class="isActive(item.to)
            ? 'bg-white/10 text-white font-medium'
            : 'text-text-secondary hover:bg-white/5 hover:text-white'"
        >
          {{ item.label }}
        </router-link>
      </nav>

      <!-- 底部用户区 -->
      <div class="px-5 py-4 border-t border-white/5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full bg-accent-cyan/20 flex items-center justify-center text-xs font-bold text-accent-cyan overflow-hidden">
              <img v-if="authStore.user?.avatar" :src="authStore.user.avatar" class="w-full h-full object-cover" />
              <span v-else>{{ userName[0]?.toUpperCase() }}</span>
            </div>
            <span class="text-text-secondary text-sm truncate">{{ userName }}</span>
          </div>
          <button
            class="text-text-muted hover:text-accent-pink transition-colors text-sm"
            title="退出登录"
            @click="handleLogout"
          >
            🚪
          </button>
        </div>
      </div>
    </aside>

    <!-- ====== 右侧内容区 ====== -->
    <main class="flex-1 min-w-0 pt-[72px] lg:pt-0">
      <div class="p-4 md:p-6 lg:p-8">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
