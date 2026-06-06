<script setup lang="ts">
import { ref, onMounted } from "vue";
import dayjs from "dayjs";
import { fetchChatters, type Chatter } from "@/api/chatters";
import client from "@/api/client";

const chatters = ref<Chatter[]>([]);
const loading = ref(true);

// 新建弹窗
const showCreate = ref(false);
const form = ref({ title: "", content: "", mood: "😌", coverImage: "", tags: "" });
const saving = ref(false);
const formError = ref("");

const moodOptions = ["😌", "🤩", "🌸", "😫", "🎉", "💡", "🎵", "😴", "🔥", "💻"];

async function load() {
  loading.value = true;
  try {
    const res = await fetchChatters();
    chatters.value = res.chatters;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  formError.value = "";
  if (!form.value.title.trim() || !form.value.content.trim()) {
    formError.value = "标题和内容为必填";
    return;
  }
  saving.value = true;
  try {
    await client.post("/chatters", {
      title: form.value.title.trim(),
      content: form.value.content.trim(),
      mood: form.value.mood,
      coverImage: form.value.coverImage || undefined,
      tags: form.value.tags ? form.value.tags.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
    });
    showCreate.value = false;
    form.value = { title: "", content: "", mood: "😌", coverImage: "", tags: "" };
    load();
  } catch {
    formError.value = "创建失败";
  } finally {
    saving.value = false;
  }
}

async function deleteChatter(id: number) {
  if (!confirm("确定删除这条杂谈？")) return;
  await client.delete(`/chatters/${id}`);
  load();
}

onMounted(load);
</script>

<template>
  <div class="max-w-[1200px] mx-auto">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">💬 杂谈管理</h1>
      <button class="glass-strong rounded-xl px-4 py-2.5 text-sm text-white font-medium hover:bg-white/15 transition-all" @click="showCreate = true">
        ＋ 发杂谈
      </button>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="glass rounded-xl p-8 text-center text-text-muted">加载中...</div>
    <div v-else-if="chatters.length === 0" class="glass rounded-xl p-8 text-center text-text-muted">暂无杂谈</div>
    <div v-else class="space-y-3">
      <div v-for="c in chatters" :key="c.id" class="glass rounded-xl p-4 flex items-start gap-4">
        <div class="shrink-0 w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-2xl">{{ c.mood || "💬" }}</div>
        <div class="flex-1 min-w-0">
          <h3 class="text-white font-bold text-sm">{{ c.title }}</h3>
          <p class="text-text-secondary text-xs line-clamp-2 mt-1">{{ c.content }}</p>
          <div class="flex items-center gap-3 mt-2 text-xs text-text-muted">
            <span>{{ dayjs(c.createdAt).format("MM/DD HH:mm") }}</span>
            <span v-for="t in c.tags" :key="t" class="px-1.5 py-0.5 rounded bg-white/5">#{{ t }}</span>
          </div>
        </div>
        <button class="shrink-0 text-text-muted hover:text-red-400 transition-colors text-sm" @click="deleteChatter(c.id)">🗑</button>
      </div>
    </div>

    <!-- 新建弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreate" class="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" @click.self="showCreate = false">
          <div class="glass-strong rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 class="text-white text-lg font-bold mb-4">💬 发杂谈</h2>
            <div class="space-y-4">
              <div>
                <label class="text-xs text-text-muted mb-1 block">标题 *</label>
                <input v-model="form.title" type="text" placeholder="想说点什么..." class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted" />
              </div>
              <div>
                <label class="text-xs text-text-muted mb-1 block">心情</label>
                <div class="flex flex-wrap gap-2">
                  <button v-for="m in moodOptions" :key="m" class="w-9 h-9 rounded-lg text-lg transition-all" :class="form.mood === m ? 'bg-white/15 scale-110' : 'glass hover:bg-white/10'" @click="form.mood = m">{{ m }}</button>
                </div>
              </div>
              <div>
                <label class="text-xs text-text-muted mb-1 block">内容 *</label>
                <textarea v-model="form.content" rows="4" placeholder="写点内容..." class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted resize-none" />
              </div>
              <div>
                <label class="text-xs text-text-muted mb-1 block">标签（逗号分隔）</label>
                <input v-model="form.tags" type="text" placeholder="日常, 前端, Vue" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted" />
              </div>
              <div>
                <label class="text-xs text-text-muted mb-1 block">封面图 URL（粘贴图床直链）</label>
                <input v-model="form.coverImage" type="text" placeholder="https://img.hgl123.icu/i/xxx.webp" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted" />
              </div>
              <p v-if="formError" class="text-accent-pink text-xs">{{ formError }}</p>
              <div class="flex gap-2">
                <button :disabled="saving" class="flex-1 glass-strong rounded-xl py-2.5 text-sm text-white font-medium hover:bg-white/15 disabled:opacity-50" @click="handleCreate">{{ saving ? '...' : '发布' }}</button>
                <button class="flex-1 glass rounded-xl py-2.5 text-sm text-text-secondary hover:text-white" @click="showCreate = false">取消</button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
