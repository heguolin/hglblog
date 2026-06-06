<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import dayjs from "dayjs";
import { fetchFriends, applyFriend, type Friend } from "@/api/friends";
import client from "@/api/client";

const friends = ref<Friend[]>([]);
const loading = ref(true);
const activeTab = ref<"pending" | "approved">("pending");

const pending = computed(() => friends.value.filter(f => !f.approved));
const approved = computed(() => friends.value.filter(f => f.approved));

// 新建弹窗
const showCreate = ref(false);
const form = ref({ name: "", url: "", avatar: "", description: "" });
const saving = ref(false);
const formError = ref("");

async function load() {
  loading.value = true;
  try {
    const { data } = await client.get("/friends/admin");
    friends.value = data;
  } catch {
    // fallback: public endpoint only returns approved
    friends.value = await fetchFriends();
  } finally {
    loading.value = false;
  }
}

async function approveFriend(id: number) {
  await client.put(`/friends/${id}`, { approved: true });
  load();
}

async function rejectFriend(id: number) {
  if (!confirm("确定拒绝此友链申请？")) return;
  await client.delete(`/friends/${id}`);
  load();
}

async function deleteFriend(id: number) {
  if (!confirm("确定删除此友链？")) return;
  await client.delete(`/friends/${id}`);
  load();
}

async function handleCreate() {
  formError.value = "";
  if (!form.value.name.trim() || !form.value.url.trim()) {
    formError.value = "名称和网址为必填";
    return;
  }
  saving.value = true;
  try {
    await applyFriend({
      name: form.value.name.trim(),
      url: form.value.url.trim(),
      avatar: form.value.avatar.trim() || undefined,
      description: form.value.description.trim() || undefined,
    });
    // 手动添加的需要立即审核通过
    const all = await fetchFriends();
    if (all.length > 0) {
      const latest = all.reduce((a, b) => a.id > b.id ? a : b);
      await client.put(`/friends/${latest.id}`, { approved: true });
    }
    showCreate.value = false;
    form.value = { name: "", url: "", avatar: "", description: "" };
    load();
  } catch {
    formError.value = "保存失败";
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="max-w-[1200px] mx-auto flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-white">🔗 友链管理</h1>
      <button class="glass-strong rounded-xl px-4 py-2.5 text-sm text-white font-medium hover:bg-white/15 transition-all" @click="showCreate = true">＋ 添加友链</button>
    </div>

    <!-- Tab -->
    <div class="flex gap-3">
      <button class="px-4 py-2 rounded-xl text-sm font-medium transition-all" :class="activeTab === 'pending' ? 'glass-strong text-white' : 'glass text-text-secondary hover:text-white'" @click="activeTab = 'pending'">
        ⏳ 待审核 ({{ pending.length }})
      </button>
      <button class="px-4 py-2 rounded-xl text-sm font-medium transition-all" :class="activeTab === 'approved' ? 'glass-strong text-white' : 'glass text-text-secondary hover:text-white'" @click="activeTab = 'approved'">
        ✅ 已通过 ({{ approved.length }})
      </button>
    </div>

    <div v-if="loading" class="glass rounded-xl p-8 text-center text-text-muted">加载中...</div>

    <!-- 待审核 -->
    <div v-else-if="activeTab === 'pending'">
      <div v-if="pending.length === 0" class="glass rounded-xl p-8 text-center text-text-muted">暂无待审核友链</div>
      <div v-else class="flex flex-col gap-4">
        <div v-for="f in pending" :key="f.id" class="glass rounded-xl p-5 flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg shrink-0">{{ f.name[0] }}</div>
          <div class="flex-1 min-w-0">
            <h3 class="text-white font-bold text-sm">{{ f.name }}</h3>
            <p class="text-text-muted text-xs truncate">{{ f.url }}</p>
            <p class="text-text-secondary text-xs mt-0.5 line-clamp-1">{{ f.description || '无简介' }}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button class="glass rounded-lg px-3 py-1.5 text-xs text-green-400 hover:bg-green-400/10 transition-colors" @click="approveFriend(f.id)">✅ 通过</button>
            <button class="glass rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 transition-colors" @click="rejectFriend(f.id)">❌ 拒绝</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 已通过 -->
    <div v-else>
      <div v-if="approved.length === 0" class="glass rounded-xl p-8 text-center text-text-muted">暂无已通过友链</div>
      <div v-else class="flex flex-col gap-4">
        <div v-for="f in approved" :key="f.id" class="glass rounded-xl p-5 flex items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-lg shrink-0">{{ f.name[0] }}</div>
          <div class="flex-1 min-w-0">
            <h3 class="text-white font-bold text-sm">{{ f.name }}</h3>
            <p class="text-text-muted text-xs truncate">{{ f.url }}</p>
            <p class="text-text-secondary text-xs mt-0.5 line-clamp-1">{{ f.description || '无简介' }}</p>
            <p class="text-text-muted text-xs mt-1">通过于 {{ dayjs(f.updatedAt).format("YYYY/MM/DD") }}</p>
          </div>
          <button class="shrink-0 text-text-muted hover:text-red-400 text-sm" @click="deleteFriend(f.id)">🗑</button>
        </div>
      </div>
    </div>

    <!-- 添加弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreate" class="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" @click.self="showCreate = false">
          <div class="glass-strong rounded-2xl p-6 w-full max-w-md">
            <h2 class="text-white text-lg font-bold mb-4">🔗 添加友链</h2>
            <div class="space-y-4">
              <input v-model="form.name" type="text" placeholder="站点名称 *" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted" />
              <input v-model="form.url" type="url" placeholder="网址 *" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted" />
              <input v-model="form.avatar" type="url" placeholder="头像 URL" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted" />
              <textarea v-model="form.description" rows="2" placeholder="简介" class="w-full glass rounded-lg px-3 py-2.5 text-white text-sm outline-none border border-white/10 focus:border-accent-cyan/50 placeholder:text-text-muted resize-none" />
              <p v-if="formError" class="text-accent-pink text-xs">{{ formError }}</p>
              <div class="flex gap-2">
                <button :disabled="saving" class="flex-1 glass-strong rounded-xl py-2.5 text-sm text-white font-medium hover:bg-white/15 disabled:opacity-50" @click="handleCreate">{{ saving ? '...' : '添加并审核通过' }}</button>
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
