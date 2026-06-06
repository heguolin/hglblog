<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import gsap from "gsap";
import { fetchFriends, applyFriend, type Friend } from "@/api/friends";
import FriendCard from "@/components/home/FriendCard.vue";
import { useSEO } from "@/composables/useSEO";

useSEO("Friends");

const friends = ref<Friend[]>([]);
const loading = ref(true);

// 申请表单
const form = ref({ name: "", url: "", avatar: "", description: "" });
const submitting = ref(false);
const submitted = ref(false);
const submitError = ref("");
const copied = ref(false);

// 复制用友链格式
const copyTemplate = `名称：HGL
简介：全栈开发者 · 二次元爱好者
链接：https://hgl123.icu
头像：http://img.hgl123.icu/i/1780730938101-EUvDVVgB.webp`;

async function loadFriends() {
  loading.value = true;
  try {
    friends.value = await fetchFriends();
    nextTick(() => {
      gsap.fromTo(".friend-card-item", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: "power2.out" });
    });
  } finally {
    loading.value = false;
  }
}

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(copyTemplate);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    submitError.value = "复制失败，请手动复制";
  }
}

async function handleSubmit() {
  if (!form.value.name.trim() || !form.value.url.trim()) {
    submitError.value = "请填写名称和网址";
    return;
  }
  submitError.value = "";
  submitting.value = true;
  try {
    await applyFriend({
      name: form.value.name.trim(),
      url: form.value.url.trim(),
      avatar: form.value.avatar.trim() || undefined,
      description: form.value.description.trim() || undefined,
    });
    submitted.value = true;
    form.value = { name: "", url: "", avatar: "", description: "" };
  } catch {
    submitError.value = "提交失败，请稍后重试";
  } finally {
    submitting.value = false;
  }
}

onMounted(() => {
  loadFriends();
});
</script>

<template>
  <!-- 最外层：占满宽度，flex justify-center 水平居中其子内容容器 -->
  <div class="w-full flex justify-center px-4">
    <!-- 内容容器：max-w 限定宽度 + mx-auto 居中；flex flex-col + gap 控制区块间距（无子元素 margin） -->
    <div class="w-full max-w-3xl flex flex-col gap-10 py-10">
      <!-- ====== 区块1：页面头部 ====== -->
      <header class="text-center">
        <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          🔗 云端引力
        </h1>
        <p class="text-text-secondary text-sm md:text-base mt-4">那些散落在赛博宇宙各处的有趣灵魂</p>
        <p class="text-text-muted text-sm mt-2">共 <span class="text-accent-cyan font-bold">{{ friends.length }}</span> 位友邻</p>
      </header>

      <!-- ====== 区块2：友链卡片网格 ====== -->
      <section>
        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 3" :key="i" class="glass rounded-xl h-64 animate-pulse" />
        </div>
        <div v-else-if="friends.length === 0" class="text-center py-16">
          <p class="text-5xl mb-4">🔗</p>
          <p class="text-text-secondary">还没有友链，来做第一个友邻吧~</p>
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="friend in friends" :key="friend.id" class="friend-card-item">
            <FriendCard :friend="friend" />
          </div>
        </div>
      </section>

      <!-- ====== 区块3：建立神经连接 ====== -->
      <section class="glass rounded-xl p-6 md:p-8">
        <h2 class="text-lg font-bold text-white mb-1">✨ 建立神经连接</h2>
        <p class="text-text-muted text-xs mb-4">欢迎交换友链，请复制下方格式后提交申请</p>
        <div class="relative glass rounded-lg p-4 text-xs font-mono text-text-secondary leading-relaxed">
          <pre class="whitespace-pre-wrap">{{ copyTemplate }}</pre>
          <button class="absolute top-3 right-3 glass rounded-lg px-3 py-1.5 text-xs text-accent-cyan hover:text-white hover:bg-white/10 transition-colors" @click="handleCopy">
            {{ copied ? '✅ 已复制' : '📋 复制' }}
          </button>
        </div>
      </section>

      <!-- ====== 区块4：提交申请 ====== -->
      <section class="glass rounded-xl p-6 md:p-8">
        <h3 class="text-white font-bold text-sm mb-1">📝 提交申请</h3>
        <p class="text-text-muted text-xs mb-5">博主审核通过后即可展示</p>
        <div v-if="submitted" class="text-center py-10">
          <p class="text-4xl mb-3">✅</p>
          <p class="text-accent-cyan font-medium">已提交，待审核</p>
          <p class="text-text-muted text-sm mt-1">博主审核通过后将在友链列表中展示</p>
          <button class="mt-4 glass rounded-xl px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors" @click="submitted = false">再申请一个</button>
        </div>
        <form v-else class="space-y-4" @submit.prevent="handleSubmit">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-text-muted mb-1">名称 <span class="text-accent-pink">*</span></label>
              <input v-model="form.name" type="text" placeholder="你的站点名称" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors placeholder:text-text-muted" required />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">网址 <span class="text-accent-pink">*</span></label>
              <input v-model="form.url" type="url" placeholder="https://your-site.com" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors placeholder:text-text-muted" required />
            </div>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">头像 URL</label>
            <input v-model="form.avatar" type="url" placeholder="https://..." class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors placeholder:text-text-muted" />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">简介</label>
            <textarea v-model="form.description" rows="2" placeholder="简单介绍一下你的站点~" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 transition-colors placeholder:text-text-muted resize-none" />
          </div>
          <p v-if="submitError" class="text-accent-pink text-xs">{{ submitError }}</p>
          <button type="submit" :disabled="submitting" class="w-full glass-strong rounded-xl py-3 text-sm text-white font-medium hover:bg-white/15 transition-all disabled:opacity-50">
            {{ submitting ? '提交中...' : '提交申请' }}
          </button>
        </form>
      </section>
    </div><!-- /内容容器 -->
  </div><!-- /最外层居中 -->
</template>
