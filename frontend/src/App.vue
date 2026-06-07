<script setup lang="ts">
import Background from "@/components/layout/Background.vue";
import DanmakuBg from "@/components/layout/DanmakuBg.vue";
import Sidebar from "@/components/layout/Sidebar.vue";
import Footer from "@/components/layout/Footer.vue";
import { useSakura } from "@/composables/useSakura";
import { useCursorGlow } from "@/composables/useCursorGlow";
import { useGsap } from "@/composables/useGsap";

// 初始化全局特效
useSakura();
useCursorGlow();
useGsap();

function getTransition(meta: Record<string, unknown>): string {
  return (meta.transition as string) || "fade";
}
</script>

<template>
  <div>
    <!-- 全局固定层 -->
    <Background />
    <DanmakuBg />

    <!-- 主布局：Grid 两栏
         左列 240px = 桌面侧边导航
         右列 1fr  = 主内容区（含移动端 fixed 导航条）
         Sidebar 组件内部通过 lg:hidden / hidden lg:flex 控制桌面端 sticky 面板和移动端 fixed 条的显隐
    -->
    <div class="relative z-10 grid grid-cols-1 lg:grid-cols-[240px_1fr] min-h-screen">
      <!-- 左列：桌面侧边栏（Sidebar 组件的桌面部分在这里渲染为 sticky） -->
      <Sidebar />

      <!-- 右列：主内容 -->
      <main class="min-w-0 flex flex-col" style="padding-top:80px">
        <div class="flex-1 pt-[72px] lg:pt-0">
          <router-view v-slot="{ Component, route }">
            <Transition
              :name="getTransition(route.meta)"
              mode="out-in"
            >
              <component :is="Component" :key="route.path" />
            </Transition>
          </router-view>
        </div>
        <Footer />
      </main>
    </div>
  </div>
</template>

<style scoped>
/* 页面转场动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.35s ease;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
