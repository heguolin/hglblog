<script setup lang="ts">
import { onMounted, ref } from "vue";

const props = withDefaults(defineProps<{ serverURL?: string; path?: string }>(), {
  serverURL: "https://waline-comment.vercel.app", // 占位：替换为你的 Waline 服务地址
  path: "/",
});

const el = ref<HTMLDivElement>();

onMounted(() => {
  // Waline 评论系统 — 自部署、无后端的评论方案
  // 使用前请：1. 部署 Waline 服务端（Vercel/Docker 等）
  //          2. 将 serverURL 替换为服务端地址
  // 参考文档：https://waline.js.org
  const script = document.createElement("script");
  script.src = "https://unpkg.com/@waline/client@v3/dist/waline.js";
  script.onload = () => {
    const Waline = (window as unknown as Record<string, unknown>).Waline as {
      init: (opts: Record<string, unknown>) => void;
    } | undefined;
    if (Waline && el.value) {
      Waline.init({
        el: el.value,
        serverURL: props.serverURL,
        path: props.path,
        dark: true,
        lang: "zh-CN",
        emoji: [
          "https://unpkg.com/@waline/emojis@1.2.0/tieba",
          "https://unpkg.com/@waline/emojis@1.2.0/bilibili",
        ],
        requiredMeta: ["nick", "mail"],
        pageSize: 10,
      });
    }
  };
  document.head.appendChild(script);

  // 注入 Waline CSS
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://unpkg.com/@waline/client@v3/dist/waline.css";
  document.head.appendChild(link);
});
</script>

<template>
  <div class="glass rounded-xl p-6 md:p-8">
    <p class="text-white text-sm font-bold mb-4">💬 评论</p>
    <div ref="el" class="waline-container" />
    <p class="text-text-muted text-xs text-center mt-2">
      评论功能使用 <a href="https://waline.js.org" target="_blank" class="text-accent-cyan hover:underline">Waline</a> 驱动 · 部署后请配置 serverURL
    </p>
  </div>
</template>
