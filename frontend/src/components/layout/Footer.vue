<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const techStack = ["Vue 3", "Tailwind v4", "GSAP", "NestJS", "Prisma", "PostgreSQL"];
const startDate = new Date("2025-01-01");
const daysRunning = ref(0);

const isLoggedIn = ref(!!localStorage.getItem("token"));
const icpBeian = ref("");

function handleEntry() {
  if (isLoggedIn.value) {
    router.push("/admin/dashboard");
  } else {
    router.push("/admin/login");
  }
}

onMounted(async () => {
  daysRunning.value = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  try {
    const res = await fetch("/api/site/icp");
    const data = await res.json();
    icpBeian.value = data.icp || "";
  } catch { /* ignore */ }
});
</script>

<template>
  <footer class="relative z-10 mt-auto">
    <div class="max-w-6xl mx-auto px-4 py-6 flex flex-col items-center gap-3 text-center">
      <!-- 技术栈标签 -->
      <div class="flex flex-wrap justify-center gap-2">
        <span
          v-for="tech in techStack"
          :key="tech"
          class="px-2 py-[2px] text-xs rounded-full bg-white/5 border border-white/10 text-text-muted"
        >
          {{ tech }}
        </span>
      </div>

      <!-- 状态行 -->
      <div class="text-xs text-text-muted flex flex-wrap justify-center gap-x-4 gap-y-1">
        <span>🟢 系统运行中</span>
        <span>已稳定运行 {{ daysRunning }} 天</span>
        <!-- 博主登录入口 — 低调放在状态行末尾 -->
        <button
          class="text-text-muted hover:text-accent-cyan transition-colors underline-offset-2 hover:underline"
          :title="isLoggedIn ? '进入管理后台' : '博主登录'"
          @click="handleEntry"
        >
          {{ isLoggedIn ? '⚡ 进入后台' : '🔑 博主登录' }}
        </button>
      </div>

      <!-- 版权 -->
      <p class="text-xs text-text-muted">
        © {{ new Date().getFullYear() }} HGL Blog · Powered by Vue & NestJS
      </p>

      <!-- ICP 备案 -->
      <p v-if="icpBeian" class="text-xs text-text-muted">
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" class="hover:text-text-secondary transition-colors">{{ icpBeian }}</a>
      </p>
    </div>
  </footer>
</template>
