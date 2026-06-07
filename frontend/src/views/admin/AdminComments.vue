<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import dayjs from "dayjs";
import client from "@/api/client";

interface C {
  id: number;
  content: string;
  nickname: string;
  email: string | null;
  status: string;
  createdAt: string;
  post: { id: number; title: string; slug: string } | null;
}

const comments = ref<C[]>([]);
const loading = ref(true);
const filter = ref<"ALL" | "PENDING" | "APPROVED">("PENDING");

const filtered = computed(() => {
  if (filter.value === "ALL") return comments.value;
  return comments.value.filter((c) => c.status === filter.value);
});

async function load() {
  loading.value = true;
  try {
    const { data } = await client.get("/comments/admin");
    comments.value = data;
  } finally {
    loading.value = false;
  }
}

async function approve(id: number) {
  await client.patch(`/comments/admin/${id}`, { status: "APPROVED" });
  load();
}

async function rejectComment(id: number) {
  await client.patch(`/comments/admin/${id}`, { status: "REJECTED" });
  load();
}

async function deleteComment(id: number) {
  if (!confirm("确定删除此评论？")) return;
  await client.delete(`/comments/admin/${id}`);
  load();
}

onMounted(load);
</script>

<template>
  <div class="max-w-[1200px] mx-auto flex flex-col gap-6">
    <h1 class="text-2xl font-bold text-white">💬 评论管理</h1>

    <!-- 筛选 tab -->
    <div class="flex gap-3">
      <button v-for="f in (['PENDING','APPROVED','ALL'] as const)" :key="f" class="px-4 py-2 rounded-xl text-sm font-medium transition-all" :class="filter === f ? 'glass-strong text-white' : 'glass text-text-secondary hover:text-white'" @click="filter = f">
        {{ f === 'PENDING' ? '⏳ 待审核' : f === 'APPROVED' ? '✅ 已通过' : '📋 全部' }}
      </button>
    </div>

    <div v-if="loading" class="glass rounded-xl p-8 text-center text-text-muted">加载中...</div>
    <div v-else-if="filtered.length === 0" class="glass rounded-xl p-8 text-center text-text-muted">暂无评论</div>
    <div v-else class="flex flex-col gap-3">
      <div v-for="c in filtered" :key="c.id" class="glass rounded-xl p-4">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-white font-bold text-sm">{{ c.nickname }}</span>
              <span v-if="c.email" class="text-text-muted text-xs">{{ c.email }}</span>
              <span class="text-xs px-2 py-0.5 rounded-full" :class="c.status === 'APPROVED' ? 'bg-green-400/10 text-green-400' : c.status === 'PENDING' ? 'bg-yellow-400/10 text-yellow-400' : 'bg-red-400/10 text-red-400'">{{ c.status }}</span>
            </div>
            <p class="text-text-secondary text-sm mb-1">{{ c.content }}</p>
            <div class="flex items-center gap-3 text-xs text-text-muted">
              <span>{{ dayjs(c.createdAt).format("YYYY-MM-DD HH:mm") }}</span>
              <span v-if="c.post">📝 {{ c.post.title?.slice(0, 30) }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button v-if="c.status !== 'APPROVED'" class="glass rounded-lg px-3 py-1.5 text-xs text-green-400 hover:bg-green-400/10 transition-colors" @click="approve(c.id)">✅ 通过</button>
            <button v-if="c.status !== 'REJECTED'" class="glass rounded-lg px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-400/10 transition-colors" @click="rejectComment(c.id)">❌ 拒绝</button>
            <button class="text-text-muted hover:text-red-400 text-sm" @click="deleteComment(c.id)">🗑</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
