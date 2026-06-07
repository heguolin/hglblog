<script setup lang="ts">
import { onMounted } from "vue";
import ProfileCard from "@/components/home/ProfileCard.vue";
import MusicCard from "@/components/home/MusicCard.vue";
import LatestPostCard from "@/components/home/LatestPostCard.vue";
import PhotoEntryCard from "@/components/home/PhotoEntryCard.vue";
import EmojiWidget from "@/components/home/EmojiWidget.vue";
import LatestChatterCard from "@/components/home/LatestChatterCard.vue";
import ThemeCard from "@/components/home/ThemeCard.vue";
import SystemInfoCard from "@/components/home/SystemInfoCard.vue";
import { useGsap } from "@/composables/useGsap";
import { useSEO } from "@/composables/useSEO";

useSEO("首页", "二次元毛玻璃风格个人博客 — Vue 3 + NestJS 全栈项目");
const { fadeInUp } = useGsap();

onMounted(() => {
  setTimeout(() => {
    fadeInUp(".bento-card", { stagger: 0.07, duration: 0.7, distance: 30 });
  }, 100);
});
</script>

<template>
  <div class="mx-auto w-full max-w-[1280px] px-4 md:px-6 lg:px-8 py-6 lg:py-10">
    <!-- Bento Grid — 桌面 grid-cols-12、平板 grid-cols-6、手机 grid-cols-1 -->
    <div class="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5 lg:gap-6">
      <!-- Row 1: ProfileCard(5)  |  MusicCard(7)
           两个都是视觉重心，加强毛玻璃 -->
      <div class="bento-card col-span-1 md:col-span-3 lg:col-span-5">
        <ProfileCard />
      </div>
      <div class="bento-card col-span-1 md:col-span-3 lg:col-span-7">
        <MusicCard />
      </div>

      <!-- Row 2: LatestPostCard(8)  |  PhotoEntryCard(4)
           文章卡扩到 8 列成为页面最强视觉锚点 -->
      <div class="bento-card col-span-1 md:col-span-3 lg:col-span-8">
        <LatestPostCard />
      </div>
      <div class="bento-card col-span-1 md:col-span-3 lg:col-span-4">
        <PhotoEntryCard />
      </div>

      <!-- Row 3: EmojiWidget(3)  |  LatestChatterCard(9) -->
      <div class="bento-card col-span-1 md:col-span-3 lg:col-span-3">
        <EmojiWidget />
      </div>
      <div class="bento-card col-span-1 md:col-span-3 lg:col-span-9">
        <LatestChatterCard />
      </div>

      <!-- Row 4: ThemeCard(3)  |  SystemInfoCard(9) -->
      <div class="bento-card col-span-1 md:col-span-3 lg:col-span-3">
        <ThemeCard />
      </div>
      <div class="bento-card col-span-1 md:col-span-3 lg:col-span-9">
        <SystemInfoCard />
      </div>
    </div>
  </div>
</template>
